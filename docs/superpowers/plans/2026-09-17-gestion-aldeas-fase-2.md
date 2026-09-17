# Gestión de Aldeas · Fase 2 · Modelo y datos locales

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para llevar el seguimiento.

**Objetivo:** guardar, abrir, exportar e importar partidas de «Gestión de Aldeas», con el estado completo de una partida escrito como modelo y validado de punta a punta.

**Arquitectura:**
- **Modelo puro en `src/dominio/modelo/`**: cada una de las 37 entidades de §8 es un esquema Zod del que se infiere su tipo TypeScript (`z.infer`), así que el esquema es la única fuente de verdad del modelo y `npx tsc -b` es quien detecta que un esquema y su tipo se han separado.
- **Guardado en `src/datos/`**: cada partida es un documento en IndexedDB (Dexie) con su fila de resumen para P0, y los catálogos de la app viven aparte, porque se comparten entre partidas (§6.5). Todo lo que toca IndexedDB vive aquí; `src/dominio` sigue siendo puro, sin Dexie, sin React y sin APIs del navegador (Zod sí, porque es el modelo).
- **La copia es un JSON con `versionFormato`** (§6.1) que se valida entero antes de escribir nada —forma, referencias, unicidades y coherencia— y se importa con «Reemplazar» o «Importar como copia», fusionando los catálogos que trae con los de esta tablet.

**Tecnología:** la de la fase 1 (Node 24, Vite 8, React 19, TypeScript 6 estricto, oxlint y Vitest 5) más tres dependencias nuevas que instala la tarea 1: **Dexie 4.4.6** (`^4.4.6`) para IndexedDB, **Zod 4.6.5** (`~4.6.5`, con `~` porque rompe en versiones menores) para el modelo y **fake-indexeddb 6.2.5** (`^6.2.5`, de desarrollo) para probar la base sin navegador. `vite.config.ts` **no se toca**: la fábrica falsa se inyecta por el constructor de Dexie, prueba a prueba.

**Referencias:**
- Especificación: `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`.
- Hoja de ruta y plan de la fase 1: `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md`.
- Vistas: `design/artboards/*.dc.html`. Todas usan el mismo ejemplo, «La Sombra del Este» el 12 de abril de 1640 T.E., y sus cifras son los casos de prueba de las tareas 18 a 21.

**Sobre las citas a los contratos y a las «decisiones propias»:** varias tareas citan `contrato-datos.md`, `contrato-modelo.md` o `contrato-cuadre.md` —los documentos de trabajo con los que se escribió este plan— y sus «decisiones propias», numeradas. Son **notas de procedencia**, para saber de dónde sale cada forma: no hay que buscarlas ni consultarlas. Todo lo necesario para ejecutar el plan está en este documento, con el código entero en cada paso.

**Reglas que valen en todas las tareas:**
- Identificadores en castellano, **sin tildes ni eñes** (`anio`, `dia`, `interesPct`, `daniado`); los textos que ve el jugador sí llevan tildes.
- TypeScript estricto; sin punto y coma, comillas simples, 2 espacios, comas finales, ancho ~120 (el estilo de la fase 1).
- `src/dominio` es puro: sin Dexie, sin React y sin `indexedDB`, `localStorage`, `window`, `document`, `navigator` ni `crypto`. Zod **sí** está permitido, y la prueba de pureza de la tarea 1 lo dice expresamente.
- Imports relativos sin extensión, sin archivos barril (`index.ts`), JSDoc de una línea en castellano citando la sección de la especificación.
- Orden TDD en cada tarea: la prueba que falla (con su fallo literal) → la implementación mínima → la prueba que pasa → `npx tsc -b` y `npm test` con su recuento → el commit.
- Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

---

## Qué entra y qué no en esta fase

**Alcance** (hoja de ruta, «Fase 2 · Modelo y datos locales»):

- tipos del estado completo de una partida (§8): dominios, cajas, movimientos, personaje, asentamientos, catálogos y avances;
- IndexedDB con Dexie: un documento por partida y catálogos de la app aparte (§6.5, ámbito de las listas);
- repositorio: listar, crear, abrir, guardar y borrar partidas;
- datos de ejemplo «La Sombra del Este» construidos con todas las cifras de las vistas;
- copia JSON con `versionFormato` (§6.1): validación, rechazo de versiones más nuevas, «Reemplazar» o «Importar como copia»;
- saldo de una caja = inicial + movimientos no programados (§7).

**Entregable** (hoja de ruta): «pruebas del repositorio con `fake-indexeddb`; la partida de ejemplo se guarda, se exporta, se importa y da la bolsa de Tharan (46,518 mo) y la caja de Bree (340,6 mo)». La tarea 21 recorre ese camino entero sobre una base real y la tarea 22 lo comprueba punto por punto.

**Lo que NO entra en esta fase:** ninguna pantalla (la interfaz empieza en la fase 6) y ningún cálculo del motor (`simular(estado, dias)` es de las fases 3 a 5). El único cálculo de la fase 2 es el saldo de una caja. Sí se escriben desde ya los campos que rellenará el motor (`Movimiento.avanceId`, `ProduccionRealizada`, `Avance.cambios[]` y `avisos[]`), para que el motor no tenga que cambiar la forma del documento ni subir `VERSION_FORMATO`.

### Las decisiones del 2026-09-17 que afectan a esta fase

Las tres primeras las decidió **el usuario**; las demás las decidió el coordinador o venían ya en los informes. Mandan sobre cualquier otra lectura de la especificación.

| # | Decisión | Qué cambia en el plan |
|---|---|---|
| 1 | **(Usuario)** La producción ya ocurrida se guarda con cantidades | La colección `produccionesRealizadas` y el esquema `ProduccionRealizada { id, fecha, edificioId, produccionId, recursoId, cantidad, perdida, avanceId }` entran en el formato 1 (tareas 5 y 20), aunque quien los rellena es el motor de la fase 4 |
| 2 | **(Usuario)** El historial del ejemplo es corto y saneado | «La Sombra del Este» arranca el 31 de marzo de 1640: ninguna regla recurrente tiene `primera` o `inicio` anterior a esa fecha y los locales se dan de alta en marzo con `cobradoHasta` en febrero (tareas 18 a 20). Los recuentos de P7 («Salarios · 12 movimientos») quedan por debajo de los de las vistas y el evento de bandidos de marzo se queda sin regla a la que afectar: lo arregla la fase 9 |
| 3 | **(Usuario)** `ImpuestoRenta` gana `categoriaId` | Campo obligatorio del esquema (tarea 5), con `cat.impuestos`, `cat.rentas-y-alquileres` y `cat.tributos` como valores iniciales, y los tres impuestos del ejemplo lo llevan (tarea 19) |
| 4 | Historial de avances, con `snapshotPrevio` solo en el último | `Avance { id, desde, hasta, aplicadoEl, cambios[], avisos[] }` en `modelo/avance.ts` y el snapshot en `modelo/documento.ts` (tarea 6); la tarea 13 comprueba que ningún avance que no sea el último lo lleva |
| 5 | Calendario de avances del ejemplo | Los cuatro avances son … → 31/3, 31/3 → 6/4, 6/4 → 10/4 y 10/4 → 12/4 de 1640 (tarea 20) |
| 6 | Forma del documento y del sobre | Documento `{ partida, …colecciones…, avances }`, sin `partidaId` dentro y con clave primaria `partida.id` en Dexie (tareas 6 y 9); sobre `{ app, versionFormato, exportadaEl, partida, catalogos }` (tarea 14) |
| 7 | La fusión de catálogos se escribe en la fase 2 | `fusionarCatalogos`, `remapearCatalogos` y `lineasDeFusion`, puras, en la tarea 16; la fase 9 solo pintará la interfaz. La ida y vuelta del entregable no la ejercita: hace falta el caso aparte de la tarea 21 |
| 8 | Convención de ids | `cat.`, `oficio.`, `edificio.`, `unidad.`, `defensa.`, `animal.` y `recurso.` más el nombre en minúsculas, sin tildes y con guiones (tarea 8); los ids del ejemplo son legibles del mismo estilo (tarea 18) y los nuevos de la app son `crypto.randomUUID()` (tarea 9) |
| 9 | `abiertaEl` y «última copia exportada» | Viven en la fila de resumen, fuera del estado: abrir cambia `abiertaEl` y no `actualizada`, y exportar anota `exportadaEl` sin contar como un cambio de la partida (tareas 6, 10 y 14) |
| 10 | Unidades de los 14 recursos que no la tenían | Sal y Carbón → saco; Leña → haz; Cuero, Tela y Hierbas → fardo; Herramientas, Armas y Vidrio → caja; Cera → pan; Carne, Vino y Pescado → barril; Oro en bruto → lingote (tarea 8) |
| 11 | Categoría de los movimientos de caravanas | «Víveres del almacén» cuando el recurso es víveres y «Comercio» en los demás (tarea 19) |
| 12 | Las deudas no tienen campo `concepto` | «Arreglo de la espada» y «Adelanto para el granero» van en `notas` (tareas 3 y 18) |
| 13 | Cambios de forma respecto a §8 | `Ruta.destino` con discriminador, `LocalComercial.cambiosEstado[]`, `ObjetoInventario.archivado` con motivo y `Obra.materiales` como `{ recursoId: cantidad }` (tareas 4 y 5) |
| 14 | Validación estricta de la copia | Se rechaza entera si falla cualquier regla estructural, con los mensajes «Este archivo no es una copia de Gestión de Aldeas» y «La copia está dañada: \<detalle\>»; los campos desconocidos se descartan y la partida y los catálogos se escriben en una sola transacción (tareas 13, 15 y 17) |
| 15 | Zod `~4.6.5` como fuente de verdad del modelo | Los tipos se infieren con `z.infer` (tareas 1 a 6) |
| 16 | Salarios y soldadas agrupados | `ReglaOrigen { tipo: 'salarios' \| 'soldadas', id }` con `detalleTrabajo` opcional, como el cobro de locales (tarea 3) |
| 17 | `OpcionCatalogo` gana el campo `lista` | `categorias`, `oficios`, `tiposEdificio`, `tiposUnidad`, `tiposDefensa` y `tiposAnimal`, con índice en Dexie (tareas 6 y 9) |
| 18 | Tipos de apoyo y signo de los importes | `Id`, `Instante` y `AnioMes`; los importes de reglas y registros son magnitudes ≥ 0 y solo `Movimiento.importe.base` lleva signo (tareas 2 y 3) |

---

## Estructura de archivos de la fase 2

`(T n)` es la tarea de este plan que crea el archivo. Cada módulo lleva su prueba al lado, como en la fase 1.

```
package.json                                  + dexie ^4.4.6, zod ~4.6.5 (dependencies) y fake-indexeddb ^6.2.5 (dev)   (T1)
package-lock.json                             bloqueo de las tres dependencias nuevas                                    (T1)
vite.config.ts                                SIN CAMBIOS: environment 'node', include ['src/**/*.test.ts'], sin setup   (T1)

src/dominio/pureza.test.ts                    el dominio no importa Dexie ni React ni usa APIs del navegador             (T1)

src/dominio/modelo/comunes.ts                 Id, Instante, AnioMes, UbicacionObjeto, los esquemas Zod de los valores
                                              de la fase 1, los nombres y los tres ayudantes de validación             (T2)
src/dominio/modelo/comunes.test.ts
src/dominio/modelo/partida.ts                 Partida, VERSION_FORMATO y hayAvances                                      (T3)
src/dominio/modelo/partida.test.ts
src/dominio/modelo/dominios.ts                Dominio (personaje y asentamiento) y Caja                                  (T3)
src/dominio/modelo/dominios.test.ts
src/dominio/modelo/movimientos.ts             Movimiento, Vinculo, ReglaOrigen, DetalleLocal, DetalleTrabajo,
                                              ObjetoPendiente, Transferencia y RecurrenteDinero                        (T3)
src/dominio/modelo/movimientos.test.ts
src/dominio/modelo/deudas.ts                  Deuda, PagoDeuda, Devengo, CargoImpago y OrigenImpago                      (T3)
src/dominio/modelo/deudas.test.ts
src/dominio/modelo/personaje.ts               MotivoArchivado, ObjetoInventario, Venta, Inversion, Hechizo,
                                              IntentoAprendizaje y Pergamino                                           (T4)
src/dominio/modelo/personaje.test.ts
src/dominio/modelo/almacen.ts                 Poblacion, Existencia, AjusteExistencias, EntradaAlmacen, ProduccionRealizada (T5)
src/dominio/modelo/almacen.test.ts
src/dominio/modelo/asentamiento.ts            Edificio, Trabajador, Obra, ImpuestoRenta, TipoLocal, LocalComercial,
                                              UnidadGuarnicion, Defensa, Animal y ObjetoArmeria                         (T5)
src/dominio/modelo/asentamiento.test.ts
src/dominio/modelo/comercio.ts                Mercado, Ruta y Caravana                                                   (T5)
src/dominio/modelo/comercio.test.ts
src/dominio/modelo/eventos.ts                 EventoNarrativo y EfectoEvento                                             (T6)
src/dominio/modelo/eventos.test.ts
src/dominio/modelo/catalogos.ts               ListaCatalogo, OpcionCatalogo, RecursoCatalogo, OpcionEnCopia,
                                              RecursoEnCopia, CatalogosEnCopia, CatalogoApp, CambiosCatalogo,
                                              Ubicacion, PersonaEntidad, NOMBRE_LISTA y ARTICULO_LISTA                 (T6)
src/dominio/modelo/catalogos.test.ts
src/dominio/modelo/avance.ts                  Avance con cambios[], avisos[] y snapshotPrevio                            (T6)
src/dominio/modelo/avance.test.ts
src/dominio/modelo/documento.ts               EstadoPartida y DocumentoPartida: el estado completo de una partida        (T6)
src/dominio/modelo/documento.test.ts
src/dominio/modelo/resumen.ts                 ResumenPartida (la fila de P0) y resumenDePartida, puro                    (T6)
src/dominio/modelo/resumen.test.ts

src/dominio/texto/normalizar.ts               normalizarNombre: comparación sin mayúsculas ni tildes, con la ñ aparte    (T7)
src/dominio/texto/normalizar.test.ts

src/dominio/catalogo/inicial.ts               las 145 opciones y los 21 recursos de fábrica, sus ids fijos y VERSION_CATALOGO (T8)
src/dominio/catalogo/inicial.test.ts

src/dominio/dinero/saldo.ts                   saldoDeCaja, saldosPorDominio y sumarBolsaInicial                          (T12)
src/dominio/dinero/saldo.test.ts

src/dominio/validacion/referencias.ts         validarReferencias: todo id apunta a algo que existe                       (T13)
src/dominio/validacion/referencias.test.ts
src/dominio/validacion/unicidades.ts          validarUnicidades: ids repetidos y nombres únicos de §6.6                  (T13)
src/dominio/validacion/unicidades.test.ts
src/dominio/validacion/coherencia.ts          validarCoherenciaInterna, validarCopia, problemasDeZod y
                                              detalleDeProblemas: importes, fechas, estados y el snapshot              (T13)
src/dominio/validacion/coherencia.test.ts

src/dominio/copia/sobre.ts                    MARCA_COPIA, EsquemaVersionDeCopia, EsquemaSobreCopia, armarCopia,
                                              catalogosUsados, serializarCopia y nombreDeArchivo                       (T14)
src/dominio/copia/sobre.test.ts
src/dominio/copia/migraciones.ts              migrar(datos, desdeVersion) y la tabla MIGRACIONES (vacía en el formato 1) (T15)
src/dominio/copia/migraciones.test.ts
src/dominio/copia/analizar.ts                 analizarCopia: JSON, versión, esquema y las tres validaciones             (T15)
src/dominio/copia/analizar.test.ts
src/dominio/copia/comoCopia.ts                comoCopia y nombreDeCopia: «Importar como copia»                           (T15)
src/dominio/copia/comoCopia.test.ts
src/dominio/copia/fusion.ts                   fusionarCatalogos, remapearCatalogos y el resumen de la fusión             (T16)
src/dominio/copia/fusion.test.ts

src/dominio/ejemplo/ids.ts                    ids legibles y fijos de «La Sombra del Este» (dom.tharan, ed.granjas-del-oeste…) (T18)
src/dominio/ejemplo/partidaYPersonaje.ts      partida, dominios, cajas, libro de Tharan, deudas, inventario, hechizos    (T18)
src/dominio/ejemplo/partidaYPersonaje.test.ts
src/dominio/ejemplo/asentamientosDinero.ts    Bree y Archet: cajas, movimientos, reglas, locales, deudas y transferencias (T19)
src/dominio/ejemplo/asentamientosDinero.test.ts
src/dominio/ejemplo/asentamientosAlmacen.ts   población, existencias, edificios, obras, comercio, animales y eventos     (T20)
src/dominio/ejemplo/asentamientosAlmacen.test.ts
src/dominio/ejemplo/avances.ts                los cuatro avances del ejemplo y el snapshotPrevio del último             (T20)
src/dominio/ejemplo/avances.test.ts
src/dominio/ejemplo/sombraDelEste.ts          documentoDeEjemplo(): junta todo en un DocumentoPartida                    (T20)
src/dominio/ejemplo/sombraDelEste.test.ts

src/datos/humo.test.ts                        humo: Dexie escribe y lee sobre una IDBFactory falsa, sin variables globales (T1)
src/datos/ids.ts                              nuevoId(): crypto.randomUUID con respaldo (toca el navegador)             (T9)
src/datos/ids.test.ts
src/datos/baseDeDatos.ts                      clase BaseDeDatos (Dexie): tablas, claves, índices y versión 1            (T9)
src/datos/baseDeDatos.test.ts
src/datos/pruebas/baseDePrueba.ts             baseDePrueba(): BaseDeDatos con una IDBFactory nueva; solo la usan las pruebas (T9)
src/datos/repositorio.ts                      listar, crear, abrir, guardar y borrar partidas, y la última usada        (T10)
src/datos/repositorio.test.ts
src/datos/ajustes.ts                          leer y guardar los ajustes de la app (clave-valor tipado)                 (T10)
src/datos/ajustes.test.ts
src/datos/catalogos.ts                        sembrar el catálogo de la app y leerlo; escribir la fusión                (T11)
src/datos/catalogos.test.ts
src/datos/copia/exportar.ts                   exportarCopia: arma el archivo y anota exportadaEl                        (T14)
src/datos/copia/exportar.test.ts
src/datos/copia/importar.ts                   examinarDestino e importarCopia: reemplazar o importar como copia         (T17)
src/datos/copia/importar.test.ts
src/datos/entregable.test.ts                  el entregable de la fase: guardar, exportar, importar y las cifras        (T21)
```

Totales: **39 archivos de código nuevos** (38 de la app y 1 helper que solo usan las pruebas) y **40 archivos de
prueba nuevos**; se modifican solo `package.json` y `package-lock.json`. Con los 8 archivos de prueba de la fase 1, el
cierre de la fase 2 ejecuta **48 archivos de prueba**.

---

## Las 22 tareas

Cada tarea deja el proyecto en verde (`npx tsc -b`, `npm test`, `npm run lint` y `npm run build`) y termina con su commit, así que se pueden ejecutar una a una y parar donde haga falta. El orden es el de la tabla: ninguna tarea usa nada que escriba una posterior.

**Los recuentos de pruebas están encadenados** y parten de las **231 pruebas en 8 archivos** que deja la fase 1. La columna «Nuevas» incluye el crecimiento de `pureza.test.ts`, que es un `it.each` sobre los módulos de `src/dominio` y suma una prueba por cada módulo nuevo del dominio sin que nadie lo toque. La fase cierra con **554 pruebas en 48 archivos**.

| # | Tarea | Depende de | Nuevas | Total de `npm test` | Archivos de prueba |
|---|---|---|---|---|---|
| — | *(punto de partida: fase 1)* | — | — | 231 | 8 |
| 1 | Dependencias y configuración | — | 12 | 243 | 10 |
| 2 | Tipos de apoyo y esquemas de los valores de la fase 1 | 1 | 18 | 261 | 11 |
| 3 | Esquemas: partida, dominios, movimientos y deudas | 2 | 20 | 281 | 15 |
| 4 | Esquemas: personaje | 2 | 16 | 297 | 16 |
| 5 | Esquemas: asentamiento, almacén y comercio | 2 | 24 | 321 | 19 |
| 6 | Esquemas: catálogos, eventos, avance, documento y resumen | 3, 4, 5 | 18 | 339 | 24 |
| 7 | `normalizarNombre` | 1 | 12 | 351 | 25 |
| 8 | Catálogo inicial de la app | 6, 7 | 16 | 367 | 26 |
| 9 | Base de datos con Dexie | 6 | 8 | 375 | 28 |
| 10 | Repositorio de partidas y ajustes | 9 | 17 | 392 | 30 |
| 11 | Siembra y lectura del catálogo | 8, 10 | 10 | 402 | 31 |
| 12 | Saldo y fórmulas de la fase | 6 | 14 | 416 | 32 |
| 13 | Validación: referencias, unicidades y coherencia | 6, 8 | 28 | 444 | 35 |
| 14 | Exportar copia | 11, 12 | 12 | 456 | 37 |
| 15 | Analizar copia: versión, migraciones y validación | 13, 14 | 16 | 472 | 40 |
| 16 | Fusión de catálogos y remapeo | 15 | 16 | 488 | 41 |
| 17 | Importar copia: reemplazar e importar como copia | 16 | 14 | 502 | 42 |
| 18 | Ejemplo: partida y personaje | 8, 12 | 14 | 516 | 43 |
| 19 | Ejemplo: asentamientos, dinero | 18 | 12 | 528 | 44 |
| 20 | Ejemplo: asentamientos, almacén y avances | 19 | 16 | 544 | 47 |
| 21 | Pruebas del entregable de la fase | 17, 20 | 10 | 554 | 48 |
| 22 | Cierre de la fase | 21 | 0 | 554 | 48 |
| | **Total de la fase 2** | | **323** | **554** | **48** |

Si al ejecutar una tarea el recuento no es el de su fila, manda lo que imprime Vitest: sigue con **tu** número y comprueba que la diferencia se mantiene constante hasta el final. Lo que no puede cambiar es el número de **archivos**, porque cada uno lo crea una tarea concreta.

---

### Tarea 1 · Dependencias y configuración

La fase 2 guarda cada partida en IndexedDB y la exporta como un JSON que se puede volver a importar. Esta tarea instala las tres bibliotecas que eso necesita —**Dexie 4.4.6** para IndexedDB, **Zod 4.6.5** para el modelo y **fake-indexeddb 6.2.5** para probarlo sin navegador— y deja escritas las dos pruebas que vigilan las dos reglas de la arquitectura durante toda la fase: que `src/dominio` sigue siendo puro (nada de Dexie, React ni APIs del navegador; Zod sí está permitido) y que Dexie funciona sobre una `IDBFactory` falsa **inyectada por el constructor**, sin variables globales y sin tocar la configuración de Vitest. Todavía no se crea ninguna base de datos ni ningún esquema: la clase `BaseDeDatos` llega en la tarea 9 y los esquemas empiezan en la tarea 2.

La prueba de pureza es un `it.each` sobre los módulos de `src/dominio`, que Vite lee como texto con `import.meta.glob`. **Crece sola**: cada tarea que añade un módulo al dominio añade una prueba a este archivo sin tocarlo. Por eso, de la tarea 2 en adelante, el recuento de `npm test` de cada tarea suma sus pruebas propias **más una por cada módulo nuevo del dominio**.

**Reglas de la especificación que implementa:**

- **Datos locales (§2, tabla «Restricciones»).** «Local en el dispositivo, funciona sin conexión. Varias partidas. Copia de seguridad exportable e importable (JSON): cada copia es una partida completa». Guardar en el dispositivo es IndexedDB, y en IndexedDB se entra con Dexie.
- **Propuesta técnica (§13).** «Aplicación web instalable (PWA) con React + TypeScript + Vite, almacenamiento en IndexedDB y el motor de avance como módulo puro con pruebas unitarias». El motor puro es `src/dominio`: la prueba de pureza es la que lo mantiene puro ahora que la fase 2 empieza a escribir en disco.
- **Validación estricta de la copia (§6.1 y decisión 14).** «Una copia con versionFormato mayor que la de la app se rechaza» y una copia dañada se rechaza entera. Comprobar un JSON que viene de fuera, campo a campo y con mensajes en castellano, es lo que hace Zod; la decisión 15 lo fija en `~4.6.5` y hace del esquema la única fuente de verdad del modelo (`z.infer`).
- **El dominio es puro (plan de la fase 1, «Estructura de archivos de la fase 1»).** «Cada módulo de `src/dominio/` es puro: no importa React ni APIs del navegador, y su prueba está al lado (`*.test.ts`)». La fase 2 añade un matiz, escrito en el contrato: Zod **sí** vive en el dominio, porque el esquema es el modelo; Dexie y `fake-indexeddb` **no**, porque tocan IndexedDB, y viven bajo `src/datos`.
- **Vitest no se toca (contrato de datos §1.2).** `vite.config.ts` se queda exactamente como está (`environment: 'node'`, `include: ['src/**/*.test.ts']`, sin `setupFiles`). La fábrica falsa se inyecta prueba a prueba, así que `globalThis.indexedDB` sigue sin existir y las 231 pruebas de la fase 1 no cambian de comportamiento.

Versiones que se instalan (comprobadas el 17 de septiembre de 2026 con Node 24.18.1 y npm 11.16.0):

| Paquete | Rango en `package.json` | Versión instalada | Dónde va |
|---|---|---|---|
| dexie | `^4.4.6` | 4.4.6 | `dependencies` |
| zod | `~4.6.5` | 4.6.5 | `dependencies` |
| fake-indexeddb | `^6.2.5` | 6.2.5 | `devDependencies` |

Zod va con `~` y no con `^` porque publica cambios que rompen en versiones **menores** (las notas de la 4.6 traen un apartado «Breaking Changes»). Es el mismo criterio que ya se usó con TypeScript (`~6.0.2`). Ninguna de las tres arrastra dependencias propias.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/pureza.test.ts`, `src/datos/humo.test.ts`
- Modificar: `package.json`, `package-lock.json`
- No toca: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`
- Prueba: los dos archivos que crea **son** las pruebas

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
cd C:/Proyectos/GA/gestion_aldeas
node -v
npm -v
git status --short
npm test
```

Salida esperada: `v24.18.1`, `11.16.0`, ninguna línea de `git status` (árbol limpio) y las 231 pruebas de la fase 1 en 8 archivos (la hora y la duración varían):

```text
v24.18.1
11.16.0

> gestion-aldeas@0.0.0 test
> vitest run


 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  8 passed (8)
      Tests  231 passed (231)
   Start at  22:45:14
   Duration  1.43s (transform 57%, tests 25%, import 14%, worker 4%)
```

Si `git status --short` muestra cambios, guárdalos o confírmalos antes de seguir. Si el recuento no es 231 en 8 archivos, para: el plan de la fase 2 cuenta desde ahí y todos los recuentos siguientes se desplazarían.

- [ ] **Paso 2: Escribir la prueba de pureza del dominio**

Crea `src/dominio/pureza.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'

/** Código de cada módulo del dominio, sin las pruebas, leído por Vite como texto. */
const MODULOS = import.meta.glob<string>(['./**/*.ts', '!./**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Los siete módulos de la fase 1: si el glob no los ve, la prueba no está comprobando nada. */
const MODULOS_FASE_1 = [
  './calendario/fecha.ts',
  './calendario/formatoFecha.ts',
  './calendario/recurrencia.ts',
  './dinero/formato.ts',
  './dinero/importe.ts',
  './dinero/monedas.ts',
  './dinero/prorrateo.ts',
]

/** Lo único que el dominio puede importar además de sus propios archivos (decisión 15: Zod es del modelo). */
const IMPORTS_PERMITIDOS = ['zod']

/** APIs del navegador que el dominio no puede usar (plan de la fase 1: «sin React ni navegador»). */
const APIS_DEL_NAVEGADOR = /\b(indexedDB|localStorage|sessionStorage|window|document|navigator|crypto|fetch)\b/

/** Quita el JSDoc y los comentarios de línea: la pureza es del código, no de lo que cuentan los comentarios. */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** De qué módulos importa un archivo: lo que va entre comillas después de `from`. */
function importados(codigo: string): string[] {
  return [...codigo.matchAll(/\bfrom '([^']+)'/g)].map((coincidencia) => coincidencia[1])
}

describe('el dominio es puro', () => {
  it('lee los módulos de src/dominio, con los siete de la fase 1', () => {
    const rutas = Object.keys(MODULOS)
    expect(rutas).toEqual(expect.arrayContaining(MODULOS_FASE_1))
    expect(rutas.length).toBeGreaterThanOrEqual(MODULOS_FASE_1.length)
  })

  it.each(Object.entries(MODULOS))('%s solo importa rutas relativas y Zod, y no toca el navegador', (_ruta, codigo) => {
    const prohibidos = importados(codigo).filter((m) => !m.startsWith('.') && !IMPORTS_PERMITIDOS.includes(m))
    expect(prohibidos).toEqual([])
    expect(sinComentarios(codigo)).not.toMatch(APIS_DEL_NAVEGADOR)
  })

  it('las pruebas del dominio se ejecutan sin IndexedDB ni navegador', () => {
    expect(typeof globalThis.indexedDB).toBe('undefined')
    expect(typeof globalThis.window).toBe('undefined')
    expect(typeof globalThis.localStorage).toBe('undefined')
  })
})
```

Tres cosas de este archivo que **no** se pueden cambiar sin romper tareas posteriores:

1. `IMPORTS_PERMITIDOS` incluye `zod` porque la decisión 15 lo mete en el dominio. Dexie, React y `fake-indexeddb` no están, y por eso la prueba muerde.
2. `sinComentarios` se aplica **antes** de buscar APIs del navegador. Hace falta: el JSDoc de `EsquemaId` (tarea 2) dice «En la app es `crypto.randomUUID()`» y el de `documento.ts` (tarea 6) habla del «documento» todo el rato. La pureza es del código, no de la prosa.
3. El primer `it` comprueba con `arrayContaining` y `toBeGreaterThanOrEqual`, no con un número exacto: así ninguna tarea posterior tiene que volver a este archivo cuando añade un módulo.

- [ ] **Paso 3: Escribir la prueba de humo de Dexie**

La carpeta `src/datos/` es nueva. Esta prueba declara su propia base de una sola tabla dentro del archivo: la clase `BaseDeDatos` de verdad llega en la tarea 9, y con ella el helper `src/datos/pruebas/baseDePrueba.ts`.

Crea `src/datos/humo.test.ts` con este contenido:

```ts
import { Dexie } from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/** Una fila de la tabla de la prueba; la base de verdad llega en la tarea 9. */
interface Nota {
  id: string
  texto: string
}

/** Base de una sola tabla sobre una IDBFactory nueva: cada llamada parte de una base vacía. */
function baseDeHumo(): Dexie {
  const db = new Dexie('humo', { indexedDB: new IDBFactory(), IDBKeyRange })
  db.version(1).stores({ notas: 'id' })
  return db
}

let db: Dexie

beforeEach(() => {
  db = baseDeHumo()
})

afterEach(() => {
  db.close()
})

describe('humo: Dexie sobre una IDBFactory falsa', () => {
  it('escribe y lee un registro', async () => {
    const notas = db.table<Nota, string>('notas')
    await notas.put({ id: 'n1', texto: 'La Sombra del Este' })
    expect(await notas.get('n1')).toEqual({ id: 'n1', texto: 'La Sombra del Este' })
    expect(await notas.count()).toBe(1)
  })

  it('cada IDBFactory nueva es una base vacía, sin estado compartido', async () => {
    await db.table<Nota, string>('notas').put({ id: 'n1', texto: 'La Sombra del Este' })
    const otra = baseDeHumo()
    try {
      expect(await otra.table<Nota, string>('notas').count()).toBe(0)
    } finally {
      otra.close()
    }
  })

  it('no hay variables globales de IndexedDB: la fábrica se inyecta', () => {
    expect(typeof globalThis.indexedDB).toBe('undefined')
  })
})
```

Dos detalles que el resto de la fase hereda:

- Al comparar lo leído con lo escrito se usa `toEqual`, **no** `toStrictEqual`: IndexedDB guarda con *structured clone* y conserva las propiedades con valor `undefined`, que JSON quita.
- `db.close()` en `afterEach`. Nunca `db.delete()` a secas: en Dexie 4.4.6, `close()` y `delete()` desactivan la reapertura automática.

- [ ] **Paso 4: Ejecutar las dos pruebas y ver que la de humo falla**

```bash
npx vitest run src/dominio/pureza.test.ts src/datos/humo.test.ts
```

Fallo esperado: la prueba de humo no arranca porque `dexie` todavía no está instalado, y la de pureza pasa con sus 9 pruebas (1 + 7 módulos + 1). La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/humo.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/humo.test.ts [ src/datos/humo.test.ts ]
Error: Cannot find package 'dexie' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/humo.test.ts
 ❯ src/datos/humo.test.ts:1:1
      1| import { Dexie } from 'dexie'
       | ^
      2| import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
      3| import { afterEach, beforeEach, describe, expect, it } from 'vitest'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  9 passed (9)
   Start at  22:52:43
   Duration  496ms (transform 77%, import 15%, worker 5%, tests 3%)
```

- [ ] **Paso 5: Instalar las tres dependencias y fijar los rangos**

`npm install` guarda `zod` con `^`; la decisión 15 lo quiere con `~`, así que se corrige el rango y se vuelve a instalar para que `package-lock.json` lo recoja.

```bash
npm install dexie@4.4.6 zod@4.6.5
npm install --save-dev fake-indexeddb@6.2.5
npm pkg set dependencies.zod='~4.6.5'
npm install
cat package.json
```

Salida esperada (el tiempo, el número de paquetes que buscan financiación y el orden de las líneas de npm varían; lo que no varía son los «found 0 vulnerabilities» y el `package.json` de abajo):

```text
added 2 packages, and audited 52 packages in 2s

14 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

added 1 package, and audited 53 packages in 2s

found 0 vulnerabilities

up to date, audited 53 packages in 1s

found 0 vulnerabilities
```

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
    "dexie": "^4.4.6",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "zod": "~4.6.5"
  },
  "devDependencies": {
    "@types/node": "^24.13.3",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "fake-indexeddb": "^6.2.5",
    "oxlint": "^1.81.0",
    "typescript": "~6.0.2",
    "vite": "^8.3.0",
    "vitest": "^5.0.1"
  }
}
```

Comprueba las versiones instaladas:

```bash
npm ls --depth=0
```

Salida esperada:

```text
gestion-aldeas@0.0.0 C:\Proyectos\GA\gestion_aldeas
+-- @types/node@24.13.5
+-- @types/react-dom@19.3.0
+-- @types/react@19.3.0
+-- @vitejs/plugin-react@6.1.1
+-- dexie@4.4.6
+-- fake-indexeddb@6.2.5
+-- oxlint@1.83.0
+-- react-dom@19.3.0
+-- react@19.3.0
+-- typescript@6.0.3
+-- vite@8.3.0
+-- vitest@5.0.1
`-- zod@4.6.5
```

- [ ] **Paso 6: Ejecutar las dos pruebas y ver que pasan**

```bash
npx vitest run src/dominio/pureza.test.ts src/datos/humo.test.ts
```

Salida esperada (la hora y la duración varían): 12 pruebas, 9 de pureza y 3 de humo.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  2 passed (2)
      Tests  12 passed (12)
   Start at  22:48:35
   Duration  655ms (import 54%, transform 37%, tests 5%, worker 4%)
```

Para verlas una a una, añade `--reporter=verbose`: aparecen las siete líneas `./calendario/fecha.ts solo importa rutas relativas y Zod, y no toca el navegador`, una por módulo del dominio. (`--reporter=basic` ya no existe en Vitest 5: no lo uses.)

- [ ] **Paso 7: Comprobar que la prueba de pureza muerde de verdad**

Una prueba que pasa desde el primer día no demuestra nada hasta que se la ve fallar. Se crea un módulo sucio, se ejecuta y se borra en el mismo paso.

```bash
printf "import { Dexie } from 'dexie'\n\nexport const sucio = typeof Dexie\n" > src/dominio/sucio.ts
npx vitest run src/dominio/pureza.test.ts
```

Fallo esperado (ahora son 10 pruebas, porque el glob ve ocho módulos; el corte de las líneas citadas varía):

```text
 ❯ src/dominio/pureza.test.ts (10 tests | 1 failed) 10ms
   ❯ el dominio es puro (10)
     × ./sucio.ts solo importa rutas relativas y Zod, y no toca el navegador 5ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/pureza.test.ts > el dominio es puro > ./sucio.ts solo importa rutas relativas y Zod, y no toca el navegador
AssertionError: expected [ 'dexie' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "dexie",
+ ]

 ❯ src/dominio/pureza.test.ts:46:24
     44|   it.each(Object.entries(MODULOS))('%s solo importa rutas relativas y …
     45|     const prohibidos = importados(codigo).filter((m) => !m.startsWith(…
     46|     expect(prohibidos).toEqual([])
       |                        ^
     47|     expect(sinComentarios(codigo)).not.toMatch(APIS_DEL_NAVEGADOR)
     48|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 9 passed (10)
```

Borra el módulo sucio y comprueba que vuelve el verde:

```bash
rm src/dominio/sucio.ts
npx vitest run src/dominio/pureza.test.ts
```

Salida esperada:

```text
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

- [ ] **Paso 8: Comprobar los tipos, todas las pruebas, el lint y la compilación**

Vitest ejecuta las pruebas sin comprobar los tipos; `tsc -b` los comprueba en todo `src/`, también en las pruebas. Es este paso el que confirma que los tipos de `fake-indexeddb` encajan en el `DexieOptions` de Dexie.

```bash
npx tsc -b
npm test
npm run lint
npm run build
```

Salida esperada: `npx tsc -b` no escribe nada; `npm test` termina con **243 pruebas en 10 archivos** (las 231 de la fase 1 más las 12 nuevas); `npm run lint` no escribe nada y sale con código 0; `npm run build` termina con `✓ built in …`.

```text
 Test Files  10 passed (10)
      Tests  243 passed (243)
```

- [ ] **Paso 9: Comprobar que no se ha tocado la configuración**

```bash
git status --short
git diff --stat vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json .oxlintrc.json
```

Salida esperada: `git diff --stat` de esos cinco archivos no escribe nada (ninguno cambia) y `git status --short` muestra solo esto:

```text
 M package-lock.json
 M package.json
?? src/datos/
?? src/dominio/pureza.test.ts
```

- [ ] **Paso 10: Commit**

```bash
git add package.json package-lock.json src/dominio/pureza.test.ts src/datos/humo.test.ts
git commit -m "chore: instalar Dexie, Zod y fake-indexeddb y probar que el dominio sigue siendo puro" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit y el recuento de líneas varían; la mayoría de las inserciones son de `package-lock.json`). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'package-lock.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'package.json', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/humo.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/pureza.test.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 0a1b2c3] chore: instalar Dexie, Zod y fake-indexeddb y probar que el dominio sigue siendo puro
 4 files changed, … insertions(+), … deletions(-)
 create mode 100644 src/datos/humo.test.ts
 create mode 100644 src/dominio/pureza.test.ts
```

---

### Tarea 2 · Tipos de apoyo y esquemas de los valores de la fase 1

Todo el modelo de la fase 2 se apoya en un solo archivo, `src/dominio/modelo/comunes.ts`: los tipos de apoyo (`Id`, `Instante`, `AnioMes`, `UbicacionObjeto`), los nombres, conceptos, notas, porcentajes y cantidades que se repiten en las 37 entidades, los tres ayudantes que convierten un validador de la fase 1 en una comprobación de Zod, y los **espejos** de los seis valores que la fase 1 ya tiene escritos a mano (`Fecha`, `Importe`, `Equivalencias`, `Recurrencia`, `Moneda` y `Edad`). Los seis espejos no reescriben ni una sola regla: llaman a `validarFecha`, `validarRecurrencia` y `validarEquivalencias` dentro de un `.check()`, para que los mensajes en castellano sigan siendo los que ya están probados, y una prueba de igualdad de tipos ata cada esquema a su tipo de la fase 1, de modo que si alguien separa los dos lados **falla `npx tsc -b`**, no la prueba.

Ninguna función de `src/dominio/calendario` ni de `src/dominio/dinero` se toca en esta tarea (ni en toda la fase 2). El archivo entero está copiado del contrato del modelo, apartado §1.2.

**Reglas de la especificación que implementa:**

- **Unidad base (§3, «Cálculo»).** «al teclear, cantidad × valor de la moneda se convierte a entero en la unidad más pequeña (hierro; 1 mo = 100.000 mh). Todas las operaciones (sumas, saldos, intereses, prorrateos, precios × cantidad) se hacen sobre esos enteros». Por eso `EsquemaImporte.base` es `z.int()`, que rechaza `NaN`, `Infinity`, los decimales y lo que se sale del rango entero seguro; e `introducido` guarda lo que tecleó el jugador, que puede faltar en los importes calculados.
- **Decimales (§3, «Redondeo»).** «Las cantidades de recursos se calculan con decimales» y «Las cantidades por habitante se guardan y se muestran con hasta 4 decimales». De ahí salen `EsquemaCantidadRecurso` (número ≥ 0, con decimales) y `decimalesComoMucho`, que cuenta los decimales sobre el texto del número y no sobre la coma flotante. Los porcentajes (impuesto de un tipo de local, interés de una deuda) admiten 2 decimales, §7.
- **Equivalencias (§6.1, P1).** «enteros ≥ 2 y, combinadas, 1 mm no puede valer más de 1.000.000.000 mh». El esquema no repite el rango: pasa el objeto por `validarEquivalencias`, que ya devuelve «La equivalencia de mithril debe ser un número entero de 2 o más» y el mensaje del tope.
- **Fechas (§4).** El esquema comprueba la forma (`anio`, `mes` y `dia` enteros) y delega el resto en `validarFecha`, que es quien sabe que «Febrero de 1641 tiene 28 días» y cuál es el año máximo.
- **Frecuencias (§4 y §6.4, A7b).** Las nueve frecuencias van en una unión discriminada por `tipo`, con `validarRecurrencia` en el `.check()`. La producción de un edificio usa una versión con ocho: «La frecuencia no ofrece «Una sola vez»: una entrada única se anota con «Añadir existencias» › Recibir sin coste».
- **Longitud de los nombres (§6.6, «Reglas comunes del nombre»).** «Longitud: de 2 a 40 caracteres en categorías, oficios, tipos y recursos; de 2 a 60 en ubicaciones, personas y entidades, negocios, mercados y hechizos». De ahí `EsquemaNombreCorto` (2–40) y `EsquemaNombreLargo` (2–60); `EsquemaNombreLibre` (1–60) es el de los registros que no tienen regla de unicidad (el nombre de la partida, el de un objeto del inventario).
- **Identificadores (decisión 8).** Los ids de fábrica y los del ejemplo son legibles (`cat.salarios`, `defensa.torre-de-vigia`, `dom.tharan`) y los de la app son `crypto.randomUUID()`. `EsquemaId` admite los dos y **solo** letras, cifras, punto, guion y guion bajo, para que una copia no pueda colar caracteres raros en un id.
- **Validación estricta de la copia (decisiones 14, 15 y 18).** El esquema es la única fuente de verdad del modelo (`z.infer`); los importes de reglas y registros son magnitudes ≥ 0 y solo `Movimiento.importe` lleva signo, así que hay tres esquemas de importe: `EsquemaImporte` (con signo), `EsquemaImporteMagnitud` (≥ 0) y `EsquemaImportePositivo` (> 0, precios).

Dos reglas de estilo que valen para esta tarea y para todas las del modelo:

1. Los `.check()` van **siempre los últimos** y **no se hace `.extend()` sobre un esquema que ya tiene `.check()`**. Donde haga falta extender (avances, estado y catálogos, tareas 6 y 13), el esquema base se deja sin `.check()`.
2. En el archivo solo se importa lo que se usa. `tsconfig.app.json` tiene `noUnusedLocals: true`, así que un `import type` que no se use **rompe `npx tsc -b`** con `error TS6133: 'X' is declared but its value is never read`. Los seis tipos de la fase 1 se importan en la **prueba**, que es donde se comparan.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/modelo/comunes.ts`
- Prueba: `src/dominio/modelo/comunes.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/modelo/` es nueva. La prueba comprueba lo que acepta y lo que rechaza cada esquema, con los mensajes literales del dominio, y remata con las seis igualdades de tipos.

Crea `src/dominio/modelo/comunes.test.ts` con este contenido:

```ts
import * as z from 'zod'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import type { Recurrencia } from '../calendario/recurrencia'
import type { Importe } from '../dinero/importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias, type Moneda } from '../dinero/monedas'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaAnioMes,
  EsquemaCantidadRecurso,
  EsquemaConcepto,
  EsquemaEdad,
  EsquemaEquivalencias,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporte,
  EsquemaImporteMagnitud,
  EsquemaImportePositivo,
  EsquemaInstante,
  EsquemaMoneda,
  EsquemaNombreCorto,
  EsquemaNombreLargo,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  EsquemaRecurrenciaProduccion,
  EsquemaUbicacionObjeto,
} from './comunes'

/** Los mensajes de un intento fallido, en orden. */
function mensajes(resultado: z.ZodSafeParseResult<unknown>): string[] {
  return resultado.success ? [] : resultado.error.issues.map((problema) => problema.message)
}

describe('tipos de apoyo', () => {
  it('EsquemaId acepta los ids legibles y los UUID, y rechaza los caracteres raros', () => {
    expect(EsquemaId.safeParse('cat.salarios').success).toBe(true)
    expect(EsquemaId.safeParse('defensa.torre-de-vigia').success).toBe(true)
    expect(EsquemaId.safeParse('0f4a1c7e-1f2b-4a3c-9d8e-2b6f0a1c7e4d').success).toBe(true)
    expect(mensajes(EsquemaId.safeParse('cat salarios'))).toEqual(['El identificador no es válido'])
    expect(mensajes(EsquemaId.safeParse(''))).toEqual(['El identificador no es válido'])
    expect(mensajes(EsquemaId.safeParse('a'.repeat(65)))).toEqual(['El identificador no es válido'])
  })

  it('EsquemaInstante acepta un instante ISO 8601 UTC y rechaza lo que no lo es', () => {
    expect(EsquemaInstante.safeParse('2026-09-17T20:15:00.000Z').success).toBe(true)
    expect(EsquemaInstante.safeParse('2026-09-17').success).toBe(false)
    expect(EsquemaInstante.safeParse('12 de abril de 1640').success).toBe(false)
  })

  it('EsquemaAnioMes acepta un año y un mes, y rechaza el mes 13', () => {
    expect(EsquemaAnioMes.parse({ anio: 1640, mes: 4 })).toEqual({ anio: 1640, mes: 4 })
    expect(EsquemaAnioMes.safeParse({ anio: 1640, mes: 13 }).success).toBe(false)
    expect(EsquemaAnioMes.safeParse({ anio: 1640, mes: 4.5 }).success).toBe(false)
  })

  it('EsquemaUbicacionObjeto admite las cuatro formas y rechaza las demás', () => {
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'encima' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'caja', dominioId: 'dom.bree' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'almacen', dominioId: 'dom.bree' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'propia', ubicacionId: 'ubi.casa' }).success).toBe(true)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'caja' }).success).toBe(false)
    expect(EsquemaUbicacionObjeto.safeParse({ tipo: 'bolsa' }).success).toBe(false)
  })

  it('los nombres, el concepto y las notas respetan sus longitudes', () => {
    expect(EsquemaNombreLibre.safeParse('A').success).toBe(true)
    expect(EsquemaNombreLibre.safeParse('').success).toBe(false)
    expect(EsquemaNombreLibre.safeParse('A'.repeat(61)).success).toBe(false)
    expect(EsquemaNombreLargo.safeParse('Posada El Poney Pisador').success).toBe(true)
    expect(EsquemaNombreLargo.safeParse('A').success).toBe(false)
    expect(EsquemaNombreCorto.safeParse('Alojamiento').success).toBe(true)
    expect(EsquemaNombreCorto.safeParse('A'.repeat(41)).success).toBe(false)
    expect(EsquemaConcepto.safeParse('Impuestos de locales · abril (4)').success).toBe(true)
    expect(EsquemaConcepto.safeParse('A'.repeat(121)).success).toBe(false)
    expect(EsquemaNotas.safeParse('Adelanto para el granero').success).toBe(true)
    expect(EsquemaNotas.safeParse('A'.repeat(1001)).success).toBe(false)
  })

  it('EsquemaPorcentaje admite 2 decimales y EsquemaCantidadRecurso no admite negativos', () => {
    expect(EsquemaPorcentaje.safeParse(12.25).success).toBe(true)
    expect(mensajes(EsquemaPorcentaje.safeParse(12.345))).toEqual(['Usa como mucho 2 decimales'])
    expect(EsquemaPorcentaje.safeParse(101).success).toBe(false)
    expect(EsquemaCantidadRecurso.safeParse(8.3333).success).toBe(true)
    expect(EsquemaCantidadRecurso.safeParse(-1).success).toBe(false)
  })

  it('EsquemaMoneda y EsquemaEdad solo admiten sus valores', () => {
    expect(EsquemaMoneda.safeParse('mo').success).toBe(true)
    expect(EsquemaMoneda.safeParse('euros').success).toBe(false)
    expect(EsquemaEdad.safeParse('tercera').success).toBe(true)
    expect(EsquemaEdad.safeParse('quinta').success).toBe(false)
  })

  it('CAMPOS_REGISTRO trae id y editadoEl, y CAMPOS_EDICION solo editadoEl', () => {
    const conRegistro = z.object({ ...CAMPOS_REGISTRO, nombre: EsquemaNombreLibre })
    expect(conRegistro.safeParse({ id: 'dom.tharan', nombre: 'Tharan' }).success).toBe(true)
    expect(
      conRegistro.safeParse({ id: 'dom.tharan', nombre: 'Tharan', editadoEl: '2026-09-17T20:15:00.000Z' }).success,
    ).toBe(true)
    expect(conRegistro.safeParse({ nombre: 'Tharan' }).success).toBe(false)
    const conEdicion = z.object({ ...CAMPOS_EDICION, dominioId: EsquemaId })
    expect(conEdicion.safeParse({ dominioId: 'dom.bree' }).success).toBe(true)
  })
})

describe('espejos de los valores de la fase 1', () => {
  it('EsquemaFecha acepta el 12 de abril de 1640', () => {
    expect(EsquemaFecha.parse({ anio: 1640, mes: 4, dia: 12 })).toEqual({ anio: 1640, mes: 4, dia: 12 })
  })

  it('EsquemaFecha rechaza el 29 de febrero de 1641 con el mensaje del dominio', () => {
    expect(mensajes(EsquemaFecha.safeParse({ anio: 1641, mes: 2, dia: 29 }))).toEqual([
      'Febrero de 1641 tiene 28 días',
    ])
    expect(mensajes(EsquemaFecha.safeParse({ anio: 1640, mes: 13, dia: 1 }))).toEqual([
      'El mes debe estar entre 1 y 12',
    ])
  })

  it('EsquemaEquivalencias acepta las de la partida y rechaza una equivalencia de 1', () => {
    expect(EsquemaEquivalencias.parse(EQUIVALENCIAS_POR_DEFECTO)).toEqual(EQUIVALENCIAS_POR_DEFECTO)
    expect(mensajes(EsquemaEquivalencias.safeParse({ ...EQUIVALENCIAS_POR_DEFECTO, mmEnMo: 1 }))).toEqual([
      'La equivalencia de mithril debe ser un número entero de 2 o más',
    ])
  })

  it('EsquemaImporte rechaza NaN, Infinity, 2 ** 53 y una cantidad mal tecleada', () => {
    expect(EsquemaImporte.safeParse({ base: -60000 }).success).toBe(true)
    expect(EsquemaImporte.safeParse({ base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } }).success).toBe(true)
    expect(EsquemaImporte.safeParse({ base: Number.NaN }).success).toBe(false)
    expect(EsquemaImporte.safeParse({ base: Number.POSITIVE_INFINITY }).success).toBe(false)
    expect(EsquemaImporte.safeParse({ base: 2 ** 53 }).success).toBe(false)
    expect(EsquemaImporte.safeParse({ base: 1.5 }).success).toBe(false)
    expect(mensajes(EsquemaImporte.safeParse({ base: 60000, introducido: { cantidad: '6 mp', moneda: 'mp' } }))).toEqual(
      ['La cantidad tecleada no es válida'],
    )
  })

  it('EsquemaImporteMagnitud rechaza los negativos y EsquemaImportePositivo también el 0', () => {
    expect(EsquemaImporteMagnitud.safeParse({ base: 0 }).success).toBe(true)
    expect(mensajes(EsquemaImporteMagnitud.safeParse({ base: -1 }))).toEqual(['El importe no puede ser negativo'])
    expect(EsquemaImportePositivo.safeParse({ base: 1 }).success).toBe(true)
    expect(mensajes(EsquemaImportePositivo.safeParse({ base: 0 }))).toEqual(['El precio debe ser mayor que 0'])
  })

  it('EsquemaRecurrencia acepta las nueve frecuencias', () => {
    const nueve: Recurrencia[] = [
      { tipo: 'diaria' },
      { tipo: 'cadaNDias', n: 10, primera: { anio: 1640, mes: 4, dia: 1 } },
      { tipo: 'semanal', diaSemana: 0 },
      { tipo: 'quincenal', primera: { anio: 1640, mes: 4, dia: 1 } },
      { tipo: 'mensual', diaMes: 1 },
      { tipo: 'cadaNMeses', n: 2, diaMes: 15, primera: { anio: 1640, mes: 4, dia: 15 } },
      { tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 4, dia: 1 } },
      { tipo: 'anual', mes: 6, diaMes: 24 },
      { tipo: 'unica', fecha: { anio: 1640, mes: 4, dia: 20 } },
    ]
    for (const recurrencia of nueve) {
      expect(EsquemaRecurrencia.safeParse(recurrencia).success).toBe(true)
    }
  })

  it('EsquemaRecurrencia rechaza N = 1 con el mensaje del dominio y un tipo que no existe', () => {
    expect(
      mensajes(EsquemaRecurrencia.safeParse({ tipo: 'cadaNDias', n: 1, primera: { anio: 1640, mes: 4, dia: 1 } })),
    ).toEqual(['N debe ser un número entero de 2 a 366'])
    expect(mensajes(EsquemaRecurrencia.safeParse({ tipo: 'bisemanal' }))).toHaveLength(1)
  })

  it('EsquemaRecurrenciaProduccion no admite «Una sola vez»', () => {
    expect(EsquemaRecurrenciaProduccion.safeParse({ tipo: 'mensual', diaMes: 1 }).success).toBe(true)
    expect(
      EsquemaRecurrenciaProduccion.safeParse({ tipo: 'unica', fecha: { anio: 1640, mes: 4, dia: 20 } }).success,
    ).toBe(false)
  })

  it('cada esquema da exactamente el tipo de la fase 1 (lo comprueba npx tsc -b)', () => {
    expectTypeOf<z.infer<typeof EsquemaMoneda>>().toEqualTypeOf<Moneda>()
    expectTypeOf<z.infer<typeof EsquemaEquivalencias>>().toEqualTypeOf<Equivalencias>()
    expectTypeOf<z.infer<typeof EsquemaImporte>>().toEqualTypeOf<Importe>()
    expectTypeOf<z.infer<typeof EsquemaFecha>>().toEqualTypeOf<Fecha>()
    expectTypeOf<z.infer<typeof EsquemaRecurrencia>>().toEqualTypeOf<Recurrencia>()
    expectTypeOf<z.infer<typeof EsquemaEdad>>().toEqualTypeOf<Edad>()
    expect(true).toBe(true)
  })
})
```

Son **17 pruebas**: 8 de los tipos de apoyo y 9 de los espejos. La última no comprueba nada en tiempo de ejecución (por eso lleva un `expect` de cierre): las seis igualdades de tipos las comprueba `npx tsc -b`, en el paso 5.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/modelo/comunes.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./comunes`, que todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/modelo/comunes.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/modelo/comunes.test.ts [ src/dominio/modelo/comunes.test.ts ]
Error: Cannot find module './comunes' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/comunes.test.ts
 ❯ src/dominio/modelo/comunes.test.ts:8:1
      6| import type { Importe } from '../dinero/importe'
      7| import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias, type Moneda } …
      8| import {
       | ^
      9|   CAMPOS_EDICION,
     10|   CAMPOS_REGISTRO,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:50:18
   Duration  363ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `comunes.ts`**

Crea `src/dominio/modelo/comunes.ts` con este contenido:

```ts
import * as z from 'zod'
import { validarFecha, type Fecha } from '../calendario/fecha'
import { validarRecurrencia } from '../calendario/recurrencia'
import { validarEquivalencias } from '../dinero/monedas'

/**
 * Identificador de un registro (§8). En la app es `crypto.randomUUID()`; las opciones de los catálogos y los
 * registros del ejemplo llevan ids fijos y legibles con prefijo y guiones («cat.alojamiento», «defensa.torre-de-vigia»,
 * «dom.tharan»), decisión 8. Se limita a letras, cifras, punto, guion y guion bajo para que un id no pueda
 * traer caracteres raros desde una copia.
 */
export const EsquemaId = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/, 'El identificador no es válido')
export type Id = z.infer<typeof EsquemaId>

/** Momento real del sistema en ISO 8601 UTC, tal como lo da `new Date().toISOString()` (decisión 18). */
export const EsquemaInstante = z.iso.datetime()
export type Instante = z.infer<typeof EsquemaInstante>

/** «Año-mes» de LocalComercial.cobradoHasta y de las producciones anotadas por mes (§8, decisión 18). */
export const EsquemaAnioMes = z.object({
  anio: z.int().min(1).max(9999),
  mes: z.int().min(1).max(12),
})
export type AnioMes = z.infer<typeof EsquemaAnioMes>

/** Añade como error cada mensaje que devuelve un validador del dominio (fase 1). */
export function conErroresDe<T>(validar: (valor: T) => string[]) {
  return (ctx: z.core.ParsePayload<T>) => {
    for (const mensaje of validar(ctx.value)) {
      ctx.issues.push({ code: 'custom', message: mensaje, input: ctx.value })
    }
  }
}

/** Añade un error con un mensaje fijo si la condición no se cumple. */
export function exige<T>(condicion: (valor: T) => boolean, mensaje: string) {
  return (ctx: z.core.ParsePayload<T>) => {
    if (!condicion(ctx.value)) {
      ctx.issues.push({ code: 'custom', message: mensaje, input: ctx.value })
    }
  }
}

/**
 * Comprueba que un número no trae más decimales de los permitidos, sin depender de la coma flotante
 * (§3: las cantidades por habitante se guardan con hasta 4 decimales; los porcentajes, con 2).
 */
export function decimalesComoMucho(decimales: number) {
  return (ctx: z.core.ParsePayload<number>) => {
    const texto = String(ctx.value)
    const punto = texto.indexOf('.')
    if (punto !== -1 && texto.length - punto - 1 > decimales) {
      ctx.issues.push({ code: 'custom', message: `Usa como mucho ${decimales} decimales`, input: ctx.value })
    }
  }
}

/** Las siete monedas de MERP (§3). Espejo de Moneda: lo ata la prueba de igualdad de tipos. */
export const EsquemaMoneda = z.enum(['mm', 'mo', 'mp', 'mb', 'mc', 'me', 'mh'])

/** Equivalencias de la partida (§3). Enteros ≥ 2 y 1 mm ≤ 1.000.000.000 mh: lo comprueba la fase 1. */
export const EsquemaEquivalencias = z
  .object({
    mmEnMo: z.int(),
    moEnMp: z.int(),
    mpEnMb: z.int(),
    mbEnMc: z.int(),
    mcEnMe: z.int(),
    meEnMh: z.int(),
  })
  .check(conErroresDe(validarEquivalencias))

/**
 * Importe con signo: `base` es un entero seguro en hierro (mh) y `introducido` es lo que tecleó el jugador,
 * vacío en los importes calculados o agrupados y en la bolsa inicial de varias filas (§3).
 * `z.int()` rechaza NaN, Infinity y lo que se sale del rango entero seguro.
 * Solo `Movimiento.importe` usa este esquema: es el único importe con signo (decisión 18).
 */
export const EsquemaImporte = z.object({
  base: z.int(),
  introducido: z
    .object({
      cantidad: z.string().regex(/^\d+(?:[.,]\d{1,6})?$/, 'La cantidad tecleada no es válida'),
      moneda: EsquemaMoneda,
    })
    .optional(),
})

/** Importe de una regla o de un registro: magnitud, nunca negativa (decisión 18). El signo lo da tipo, sentido u operacion. */
export const EsquemaImporteMagnitud = EsquemaImporte.check(
  exige((i) => i.base >= 0, 'El importe no puede ser negativo'),
)

/** Importe que además tiene que ser mayor que 0: precios de mercado y precios por unidad (§6.6, «precio mayor que 0»). */
export const EsquemaImportePositivo = EsquemaImporte.check(
  exige((i) => i.base > 0, 'El precio debe ser mayor que 0'),
)

/** Fecha del calendario gregoriano proléptico (§4). Las reglas y los mensajes son los de validarFecha. */
export const EsquemaFecha = z
  .object({ anio: z.int(), mes: z.int(), dia: z.int() })
  .check(
    conErroresDe((f: Fecha) => {
      const error = validarFecha(f)
      return error === null ? [] : [error]
    }),
  )

/** Las ocho frecuencias que admite una producción de edificio: todas menos «Una sola vez» (§6.4, A7b). */
const OPCIONES_RECURRENCIA_SIN_UNICA = [
  z.object({ tipo: z.literal('diaria'), inicio: EsquemaFecha.optional() }),
  z.object({ tipo: z.literal('cadaNDias'), n: z.int(), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('semanal'), diaSemana: z.int(), inicio: EsquemaFecha.optional() }),
  z.object({ tipo: z.literal('quincenal'), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('mensual'), diaMes: z.int(), inicio: EsquemaFecha.optional() }),
  z.object({ tipo: z.literal('cadaNMeses'), n: z.int(), diaMes: z.int(), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('trimestral'), diaMes: z.int(), primera: EsquemaFecha }),
  z.object({ tipo: z.literal('anual'), mes: z.int(), diaMes: z.int(), inicio: EsquemaFecha.optional() }),
] as const

/** La novena: «Una sola vez». */
const OPCION_RECURRENCIA_UNICA = z.object({ tipo: z.literal('unica'), fecha: EsquemaFecha })

/** Las nueve frecuencias (§4 y §8). Rangos y mensajes: los de validarRecurrencia. */
export const EsquemaRecurrencia = z
  .discriminatedUnion('tipo', [...OPCIONES_RECURRENCIA_SIN_UNICA, OPCION_RECURRENCIA_UNICA])
  .check(conErroresDe(validarRecurrencia))

/** Frecuencia de una producción: sin «Una sola vez» (§6.4, «La frecuencia no ofrece «Una sola vez»»). */
export const EsquemaRecurrenciaProduccion = z
  .discriminatedUnion('tipo', [...OPCIONES_RECURRENCIA_SIN_UNICA])
  .check(conErroresDe(validarRecurrencia))
export type RecurrenciaProduccion = z.infer<typeof EsquemaRecurrenciaProduccion>

/** Edad de la partida (§4). Espejo de Edad. */
export const EsquemaEdad = z.enum(['segunda', 'tercera', 'cuarta'])

/** Campos que llevan todos los registros editables: id y «editadoEl», que se muestra (§8). */
export const CAMPOS_REGISTRO = {
  id: EsquemaId,
  editadoEl: EsquemaInstante.optional(),
}

/** Campos de los registros sin id propio (Caja, Poblacion, Existencia, Ruta), que también guardan editadoEl (§8). */
export const CAMPOS_EDICION = {
  editadoEl: EsquemaInstante.optional(),
}

/** Nombre libre de un registro: obligatorio, de 1 a 60 caracteres, sin unicidad (decisión propia 6). */
export const EsquemaNombreLibre = z.string().min(1).max(60)

/** Nombre sujeto a las reglas comunes de §6.6 con longitud de 2 a 60: ubicaciones, personas, hechizos, mercados y negocios. */
export const EsquemaNombreLargo = z.string().min(2).max(60)

/** Nombre sujeto a las reglas comunes de §6.6 con longitud de 2 a 40: catálogos, recursos y tipos de local. */
export const EsquemaNombreCorto = z.string().min(2).max(40)

/** Concepto de un movimiento o motivo de un cambio: «Impuestos de locales · abril (4)» (§9). */
export const EsquemaConcepto = z.string().min(1).max(120)

/** Notas y descripciones: texto libre opcional. */
export const EsquemaNotas = z.string().max(1000)

/** Porcentaje de 0 a 100 con hasta 2 decimales, como el impuesto de un tipo de local (§7). */
export const EsquemaPorcentaje = z.number().min(0).max(100).check(decimalesComoMucho(2))

/** Cantidad de un recurso: con decimales y nunca negativa (§3, «se calculan con decimales»). */
export const EsquemaCantidadRecurso = z.number().min(0)

/**
 * Dónde está un objeto (§8). La unión discriminada impide combinaciones inválidas. La bolsa no es ubicación.
 * Vive aquí, y no en `personaje.ts`, porque también lo usa `Movimiento.objetoPendiente` y `movimientos.ts`
 * se escribe antes que `personaje.ts` (decisión propia 36).
 */
export const EsquemaUbicacionObjeto = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('encima') }),
  z.object({ tipo: z.literal('caja'), dominioId: EsquemaId }),
  z.object({ tipo: z.literal('almacen'), dominioId: EsquemaId }),
  z.object({ tipo: z.literal('propia'), ubicacionId: EsquemaId }),
])
export type UbicacionObjeto = z.infer<typeof EsquemaUbicacionObjeto>
```

Cuatro avisos para quien lo copie:

- **El bloque de imports es este y no el del contrato.** `contrato-modelo.md` §1.2 encabeza el archivo importando además `type Recurrencia`, `type Edad`, `type Importe`, `type Equivalencias` y `type Moneda`; ninguno de los cinco se usa en el cuerpo, y con `noUnusedLocals` eso rompe `npx tsc -b` (`error TS6133: 'Recurrencia' is declared but its value is never read`). Los seis tipos de la fase 1 se comparan en la prueba, que es donde sí se importan.
- `type Fecha` **sí** se importa: lo usa la función que envuelve a `validarFecha`.
- El JSDoc de `EsquemaId` nombra `crypto.randomUUID()`. La prueba de pureza de la tarea 1 quita los comentarios antes de buscar APIs del navegador, así que este archivo sigue pasándola. No hace falta cambiar ni el JSDoc ni la prueba.
- Los tipos que **no** se declaran aquí (`Moneda`, `Equivalencias`, `Importe`, `Fecha`, `Recurrencia`, `Edad`) siguen viniendo de la fase 1: el resto del modelo los importa de `../calendario/…` y `../dinero/…`, no de `comunes.ts`.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/modelo/comunes.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  22:47:13
   Duration  513ms (import 56%, transform 36%, tests 6%, worker 2%)
```

- [ ] **Paso 5: Comprobar que la igualdad de tipos muerde de verdad**

Las seis igualdades de tipos no fallan en `vitest run`: fallan en `npx tsc -b`. Se comprueba rompiendo una a propósito.

En `src/dominio/modelo/comunes.ts`, cambia temporalmente la línea de `EsquemaEdad` por esta (sin `'cuarta'`):

```ts
export const EsquemaEdad = z.enum(['segunda', 'tercera'])
```

```bash
npx tsc -b
```

Fallo esperado (la línea y la columna varían si el archivo se ha editado):

```text
src/dominio/modelo/comunes.test.ts(187,63): error TS2344: Type 'Edad' does not satisfy the constraint '"Expected: literal string: segunda, Actual: never" | "Expected: literal string: tercera, Actual: never" | "Expected: literal string: cuarta, Actual: never"'.
  Type '"segunda"' is not assignable to type '"Expected: literal string: segunda, Actual: never" | "Expected: literal string: tercera, Actual: never" | "Expected: literal string: cuarta, Actual: never"'.
```

Devuelve la línea a su valor bueno:

```ts
export const EsquemaEdad = z.enum(['segunda', 'tercera', 'cuarta'])
```

```bash
npx tsc -b
```

Salida esperada: `npx tsc -b` no escribe nada.

- [ ] **Paso 6: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **261 pruebas en 11 archivos**. Son **18 pruebas nuevas**: las 17 de `comunes.test.ts` y **una más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/modelo/comunes.ts`.

```text
 Test Files  11 passed (11)
      Tests  261 passed (261)
```

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/modelo/comunes.ts src/dominio/modelo/comunes.test.ts
git commit -m "feat(modelo): tipos de apoyo y esquemas Zod de los valores de la fase 1" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit y el recuento de líneas varían). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/modelo/comunes.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/comunes.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 1b2c3d4] feat(modelo): tipos de apoyo y esquemas Zod de los valores de la fase 1
 2 files changed, 371 insertions(+)
 create mode 100644 src/dominio/modelo/comunes.test.ts
 create mode 100644 src/dominio/modelo/comunes.ts
```

---

### Tarea 3 · Esquemas: partida, dominios, movimientos y deudas

El dinero de la partida son cuatro archivos del modelo: la cabecera de la partida (nombre, Edad, equivalencias y las dos fechas), los dominios (el personaje y sus asentamientos) con su caja, el libro de movimientos con todo lo que le cuelga (vínculos, reglas recurrentes, detalles agrupados y transferencias) y las deudas con sus pagos, sus devengos y sus impagos. Esta tarea los escribe como esquemas Zod, de los que se infiere el tipo TypeScript (decisión 15), y añade la única función de `partida.ts`, `hayAvances`, que P1 necesita para saber si la fecha inicial y la Edad siguen siendo editables. Todo es dominio puro: no toca IndexedDB ni el navegador, y las reglas de fecha, recurrencia y equivalencias no se repiten, sino que se llaman las de la fase 1 a través de los ayudantes de `modelo/comunes.ts` (tarea 2).

**Reglas de la especificación que implementa:**

- **Cabecera de la partida (§8).** `Partida { id, nombre, edad: segunda|tercera|cuarta, equivalencias, kgPorSaco: 30, díasPorSaco: 30 (fijo), fechaInicial, fechaActual(año, mes, día), creada, actualizada, versionFormato, cambiosDesdeÚltimoAvance }`. La ración es fija: «1 saco de 30 kg = 1 persona durante 30 días» (P1), y no hay «Cambiar ración».
- **Fecha inicial y Edad editables hasta el primer avance (§4).** «La fecha actual de la partida se guarda como fecha (año, mes, día). La fecha inicial y la Edad se corrigen en «Editar partida» mientras no haya ningún avance». Solo un avance mueve `fechaActual`, así que `hayAvances` es `fechaActual !== fechaInicial`.
- **Versión del formato (§6.1).** «**versionFormato**: el formato 1 ya usa Hechizo, TipoLocal y LocalComercial». Una copia con un número mayor se rechaza y una con uno menor se migra (tarea 15); por eso `versionFormato` es un literal y no un entero cualquiera.
- **Un solo personaje (§8).** `Dominio { id, partidaId, tipo: personaje|asentamiento, nombre, descripción?, categoría?: aldea|pueblo|ciudad }   // un solo personaje`. El documento ya es una partida, así que `partidaId` desaparece (decisión 6): esa unicidad la comprueba `validacion/unicidades.ts` en la tarea 13, no el esquema.
- **La caja no guarda su saldo (§8, §7).** `Caja { dominioId, saldoInicial: Importe }   // saldo = inicial + movimientos no programados`. El saldo se calcula (tarea 12) y el saldo inicial es una magnitud: el campo de importe no admite signo (§3).
- **Movimiento, vínculo y regla (§8).** «vínculo: registro del que sale (transferencia (Transferencia.id), venta, pago o alta de deuda, inversión, obra, caravana, entrada del almacén, pergamino); se edita desde ese registro» y «regla: regla recurrente que lo creó (salario, soldada, tributo, impuesto, gasto o ingreso recurrente, beneficio, locales); no es vinculado».
- **Cobro agrupado de locales y detalle por local (§8).** «regla = { tipo: locales, id: dominioId }: cobro agrupado de los impuestos de locales de un asentamiento en un día» y «detalleLocales: solo en ese cobro; una entrada por local y mes cobrado, que J2c muestra en solo lectura; al eliminar un local, su entrada conserva el nombre, sin localId».
- **Salarios y soldadas agrupados (decisión 16).** `regla { tipo: 'salarios' | 'soldadas', id: dominioId }`, con detalle opcional por trabajador o por unidad, igual que el cobro de locales.
- **Las dos caras de una transferencia (§8).** «cada lado guarda su concepto en su movimiento («Transferencia a Bree», «Transferencia desde Tharan»)».
- **Regla recurrente de dinero sin primera fecha propia (§8).** `RecurrenteDinero { … recurrencia, activo }   // sustituye a GastoRecurrente; sin primeraFecha propia: la fecha del primer cobro va en la recurrencia (primera o inicio)`.
- **Deudas sin campo «concepto» (decisión 12).** «Arreglo de la espada» y «Adelanto para el granero» van en `notas`. La deuda de impago acumula sus cargos: «acumula los impagos sucesivos mientras esté abierta» (§9).
- **Importes con signo y sin signo (decisión 18).** «Todo el dinero es `Importe`, sin `introducido` cuando es calculado. Los importes de reglas y registros son magnitudes ≥ 0; solo `Movimiento.importe.base` lleva signo».
- **El dominio es puro (plan de la fase 1).** Los cuatro archivos solo importan Zod, `modelo/comunes.ts` y, en `partida.ts`, `compararFechas` de la fase 1. La prueba de pureza de la tarea 1 recorre también estos cuatro módulos nuevos.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/modelo/partida.ts`, `src/dominio/modelo/dominios.ts`, `src/dominio/modelo/movimientos.ts`, `src/dominio/modelo/deudas.ts`
- Prueba: `src/dominio/modelo/partida.test.ts`, `src/dominio/modelo/dominios.test.ts`, `src/dominio/modelo/movimientos.test.ts`, `src/dominio/modelo/deudas.test.ts`

**Cómo se comportan los `.check()` de Zod 4.6.5** (comprobado): un `exige(...)` que falla **aborta los `.check()` siguientes** del mismo esquema, porque la incidencia se apila sin `continue: true`. Por eso cada `safeParse` de las pruebas espera **un solo mensaje**, y los casos que rompen dos reglas a la vez se prueban por separado. Los mensajes de un validador de la fase 1 (`conErroresDe`) sí salen todos juntos, porque se apilan en la misma comprobación.

- [ ] **Paso 1: Escribir las cuatro pruebas que fallan**

La carpeta `src/dominio/modelo/` ya existe (la creó la tarea 2, con `comunes.ts`). Los datos de las pruebas son los de «La Sombra del Este» el 12 de abril de 1640 T.E.

Crea `src/dominio/modelo/partida.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { EsquemaPartida, VERSION_FORMATO, hayAvances, type Partida } from './partida'

/** La cabecera de «La Sombra del Este» el 12 de abril de 1640 T.E., que usan todas las vistas. */
const SOMBRA_DEL_ESTE: Partida = {
  id: 'p.sombra-del-este',
  nombre: 'La Sombra del Este',
  edad: 'tercera',
  equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
  kgPorSaco: 30,
  diasPorSaco: 30,
  fechaInicial: { anio: 1640, mes: 1, dia: 1 },
  fechaActual: { anio: 1640, mes: 4, dia: 12 },
  creada: '2026-09-15T10:00:00.000Z',
  actualizada: '2026-09-17T18:30:00.000Z',
  versionFormato: VERSION_FORMATO,
  cambiosDesdeUltimoAvance: 0,
}

describe('EsquemaPartida', () => {
  it('acepta la cabecera de la partida de ejemplo', () => {
    expect(VERSION_FORMATO).toBe(1)
    expect(EsquemaPartida.parse(SOMBRA_DEL_ESTE)).toEqual(SOMBRA_DEL_ESTE)
  })

  it('rechaza las fechas y los literales que no cuadran', () => {
    const alReves = EsquemaPartida.safeParse({
      ...SOMBRA_DEL_ESTE,
      fechaActual: { anio: 1639, mes: 12, dia: 31 },
    })
    expect(alReves.success).toBe(false)
    expect(alReves.error?.issues.map((i) => i.message)).toEqual([
      'La fecha actual no puede ser anterior a la fecha inicial',
    ])

    const imposible = EsquemaPartida.safeParse({
      ...SOMBRA_DEL_ESTE,
      fechaInicial: { anio: 1641, mes: 2, dia: 29 },
    })
    expect(imposible.success).toBe(false)
    expect(imposible.error?.issues.map((i) => i.message)).toContain('Febrero de 1641 tiene 28 días')

    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, kgPorSaco: 25 }).success).toBe(false)
    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, diasPorSaco: 45 }).success).toBe(false)
    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, versionFormato: 2 }).success).toBe(false)
    expect(EsquemaPartida.safeParse({ ...SOMBRA_DEL_ESTE, cambiosDesdeUltimoAvance: -1 }).success).toBe(false)
  })
})

describe('hayAvances', () => {
  it('es false en una partida recién creada y true cuando la fecha actual ya se ha movido', () => {
    expect(hayAvances({ ...SOMBRA_DEL_ESTE, fechaActual: { anio: 1640, mes: 1, dia: 1 } })).toBe(false)
    expect(hayAvances(SOMBRA_DEL_ESTE)).toBe(true)
  })
})
```

Crea `src/dominio/modelo/dominios.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaCaja,
  EsquemaDominio,
  type Caja,
  type DominioAsentamiento,
  type DominioPersonaje,
} from './dominios'

/** El personaje de «La Sombra del Este». */
const THARAN: DominioPersonaje = {
  id: 'dom.tharan',
  tipo: 'personaje',
  nombre: 'Tharan',
  descripcion: 'Explorador del Norte',
}

/** Bree, el pueblo del ejemplo. */
const BREE: DominioAsentamiento = {
  id: 'dom.bree',
  tipo: 'asentamiento',
  nombre: 'Bree',
  categoria: 'pueblo',
  alta: { anio: 1640, mes: 1, dia: 1 },
}

describe('EsquemaDominio', () => {
  it('acepta el personaje y el asentamiento del ejemplo', () => {
    expect(EsquemaDominio.parse(THARAN)).toEqual(THARAN)
    expect(EsquemaDominio.parse(BREE)).toEqual(BREE)
  })

  it('rechaza un tipo de dominio y una categoría que no existen', () => {
    expect(EsquemaDominio.safeParse({ ...BREE, tipo: 'reino' }).success).toBe(false)
    expect(EsquemaDominio.safeParse({ ...BREE, categoria: 'aldehuela' }).success).toBe(false)
    expect(EsquemaDominio.safeParse({ ...THARAN, alta: { anio: 1640, mes: 1, dia: 1 } }).success).toBe(true)
  })
})

describe('EsquemaCaja', () => {
  it('acepta la bolsa de Tharan y rechaza un saldo inicial negativo', () => {
    const bolsa: Caja = { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } }
    expect(EsquemaCaja.parse(bolsa)).toEqual(bolsa)

    const negativa = EsquemaCaja.safeParse({ dominioId: 'dom.bree', saldoInicial: { base: -1 } })
    expect(negativa.success).toBe(false)
    expect(negativa.error?.issues.map((i) => i.message)).toEqual(['El importe no puede ser negativo'])
  })
})
```

Crea `src/dominio/modelo/movimientos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaMovimiento,
  EsquemaRecurrenteDinero,
  EsquemaTransferencia,
  type Movimiento,
  type RecurrenteDinero,
  type Transferencia,
} from './movimientos'

/** El peaje del camino del 12 de abril de 1640: +0,6 mo agrupados por el avance del 10 al 12 (A2). */
const PEAJE: Movimiento = {
  id: 'mov.peaje.12abril',
  dominioId: 'dom.bree',
  fecha: { anio: 1640, mes: 4, dia: 12 },
  tipo: 'ingreso',
  importe: { base: 60000 },
  categoriaId: 'cat.impuestos',
  concepto: 'Peaje del camino · 2 días',
  origen: 'avance',
  avanceId: 'av.10-12abr',
  regla: { tipo: 'impuesto', id: 'imp.peaje' },
  programado: false,
}

describe('EsquemaMovimiento', () => {
  it('acepta el peaje del 12 de abril del ejemplo', () => {
    expect(EsquemaMovimiento.parse(PEAJE)).toEqual(PEAJE)
  })

  it('rechaza un tipo que no está en la enumeración y un origen desconocido', () => {
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, tipo: 'donacion' }).success).toBe(false)
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, origen: 'motor' }).success).toBe(false)
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, id: 'mov peaje' }).success).toBe(false)
  })

  it('exige avanceId cuando el movimiento lo creó un avance', () => {
    const sinAvance = EsquemaMovimiento.safeParse({ ...PEAJE, avanceId: undefined })
    expect(sinAvance.success).toBe(false)
    expect(sinAvance.error?.issues.map((i) => i.message)).toEqual(['Un movimiento del avance guarda su avanceId'])
    expect(EsquemaMovimiento.safeParse({ ...PEAJE, origen: 'manual', avanceId: undefined }).success).toBe(true)
  })

  it('ata el signo del importe al tipo del movimiento', () => {
    const gasto = EsquemaMovimiento.safeParse({ ...PEAJE, tipo: 'gasto', importe: { base: 60000 } })
    expect(gasto.success).toBe(false)
    expect(gasto.error?.issues.map((i) => i.message)).toEqual(['El importe de un gasto no puede ser positivo'])

    const ingreso = EsquemaMovimiento.safeParse({ ...PEAJE, importe: { base: -60000 } })
    expect(ingreso.success).toBe(false)
    expect(ingreso.error?.issues.map((i) => i.message)).toEqual(['El importe de un ingreso no puede ser negativo'])

    const suelto = EsquemaMovimiento.safeParse({ ...PEAJE, tipo: 'transferencia' })
    expect(suelto.success).toBe(false)
    expect(suelto.error?.issues.map((i) => i.message)).toEqual([
      'Solo un movimiento de transferencia lleva el vínculo «transferencia», y al revés',
    ])
  })

  it('admite un detalle de local sin localId, pero solo en el cobro agrupado de locales', () => {
    const detalleLocales = [
      {
        nombre: 'Herrería de Bree',
        mes: { anio: 1640, mes: 3 },
        produccion: { base: 3000000 },
        anotada: false,
        impuesto: { base: 450000 },
      },
    ]
    const cobro = {
      ...PEAJE,
      id: 'mov.locales.1abril',
      concepto: 'Impuestos de locales · marzo (1)',
      categoriaId: 'cat.impuestos',
      regla: { tipo: 'locales' as const, id: 'dom.bree' },
      detalleLocales,
    }
    expect(EsquemaMovimiento.parse(cobro)).toEqual(cobro)

    const sinRegla = EsquemaMovimiento.safeParse({ ...cobro, regla: { tipo: 'impuesto', id: 'imp.peaje' } })
    expect(sinRegla.success).toBe(false)
    expect(sinRegla.error?.issues.map((i) => i.message)).toEqual([
      'El detalle por local solo va en el cobro agrupado de impuestos de locales',
    ])
    expect(EsquemaMovimiento.safeParse({ ...cobro, detalleLocales: [] }).success).toBe(false)
  })

  it('admite el detalle por trabajador solo en salarios o en soldadas (decisión 16)', () => {
    const detalleTrabajo = [
      { origenId: 'trab.granjeros', nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
      { nombre: 'Pastor', numero: 1, importe: { base: 30000 } },
    ]
    const salarios = {
      ...PEAJE,
      id: 'mov.salarios.13abril',
      tipo: 'gasto' as const,
      importe: { base: -210000 },
      categoriaId: 'cat.salarios',
      concepto: 'Salarios · Bree',
      regla: { tipo: 'salarios' as const, id: 'dom.bree' },
      detalleTrabajo,
    }
    expect(EsquemaMovimiento.parse(salarios)).toEqual(salarios)
    expect(
      EsquemaMovimiento.safeParse({ ...salarios, regla: { tipo: 'soldadas', id: 'dom.bree' } }).success,
    ).toBe(true)

    const mal = EsquemaMovimiento.safeParse({ ...salarios, regla: { tipo: 'recurrente', id: 'rec.posada' } })
    expect(mal.success).toBe(false)
    expect(mal.error?.issues.map((i) => i.message)).toEqual([
      'El detalle por trabajador solo va en el pago agrupado de salarios o de soldadas',
    ])
  })

  it('guarda las transferencias y las reglas recurrentes del personaje', () => {
    const transferencia: Transferencia = {
      id: 'trf.bree-archet.6abril',
      fecha: { anio: 1640, mes: 4, dia: 6 },
      importe: { base: 6000000, introducido: { cantidad: '60', moneda: 'mo' } },
      saleDeId: 'dom.bree',
      entraEnId: 'dom.archet',
      movimientoSaleId: 'mov.trf.sale',
      movimientoEntraId: 'mov.trf.entra',
    }
    expect(EsquemaTransferencia.parse(transferencia)).toEqual(transferencia)

    const mismoDominio = EsquemaTransferencia.safeParse({ ...transferencia, entraEnId: 'dom.bree' })
    expect(mismoDominio.success).toBe(false)
    expect(mismoDominio.error?.issues.map((i) => i.message)).toEqual([
      '«Sale de» y «Entra en» deben ser distintos',
    ])

    const posada: RecurrenteDinero = {
      id: 'rec.posada',
      dominioId: 'dom.tharan',
      tipo: 'gasto',
      concepto: 'Posada El Poney Pisador',
      importe: { base: 20000, introducido: { cantidad: '0,2', moneda: 'mo' } },
      categoriaId: 'cat.alojamiento',
      cuentaId: 'dom.tharan',
      recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 1 } },
      activo: true,
      unidadDiaria: 'noches',
    }
    expect(EsquemaRecurrenteDinero.parse(posada)).toEqual(posada)

    const frecuenciaMala = EsquemaRecurrenteDinero.safeParse({
      ...posada,
      recurrencia: { tipo: 'cadaNDias', n: 1, primera: { anio: 1640, mes: 4, dia: 1 } },
    })
    expect(frecuenciaMala.success).toBe(false)
    expect(frecuenciaMala.error?.issues.map((i) => i.message)).toEqual([
      'N debe ser un número entero de 2 a 366',
    ])
  })
})
```

Crea `src/dominio/modelo/deudas.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { EsquemaDeuda, type Deuda } from './deudas'

/** La deuda de Tharan con el Gremio de mercaderes de Bree: 42 mo al 4,5 % trimestral (J4). */
const GREMIO: Deuda = {
  id: 'deuda.gremio',
  dominioId: 'dom.tharan',
  sentido: 'debo',
  contraparteId: 'persona.gremio-bree',
  fecha: { anio: 1640, mes: 4, dia: 1 },
  principal: { base: 4200000, introducido: { cantidad: '42', moneda: 'mo' } },
  interesPct: 4.5,
  recurrenciaInteres: { tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 7, dia: 1 } },
  vencimiento: { anio: 1641, mes: 4, dia: 1 },
  notas: 'Adelanto para el granero',
  estado: 'abierta',
  impago: false,
  pagos: [
    {
      id: 'pago.gremio.1',
      fecha: { anio: 1640, mes: 4, dia: 10 },
      importe: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
      aplicarA: 'interesesYCapital',
      movimientoId: 'mov.pago.gremio.1',
    },
  ],
  devengos: [{ fecha: { anio: 1640, mes: 4, dia: 1 }, importe: { base: 189000 }, avanceId: 'av.31mar-6abr' }],
}

describe('EsquemaDeuda', () => {
  it('acepta la deuda del Gremio con su interés, sus pagos y sus devengos', () => {
    expect(EsquemaDeuda.parse(GREMIO)).toEqual(GREMIO)
  })

  it('no tiene campo «concepto» y deja sin frecuencia las deudas sin interés (decisión 12)', () => {
    const sinInteres = {
      ...GREMIO,
      id: 'deuda.espada',
      interesPct: 0,
      recurrenciaInteres: undefined,
      vencimiento: undefined,
      notas: 'Arreglo de la espada',
      pagos: [],
      devengos: [],
    }
    const leida = EsquemaDeuda.parse(sinInteres)
    expect(leida).toEqual(sinInteres)
    expect('concepto' in leida).toBe(false)
    expect(EsquemaDeuda.parse({ ...sinInteres, concepto: 'Arreglo de la espada' })).toEqual(sinInteres)

    const conFrecuencia = EsquemaDeuda.safeParse({
      ...sinInteres,
      recurrenciaInteres: { tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 7, dia: 1 } },
    })
    expect(conFrecuencia.success).toBe(false)
    expect(conFrecuencia.error?.issues.map((i) => i.message)).toEqual([
      'La frecuencia del interés va si y solo si el interés es mayor que 0',
    ])
  })

  it('exige origen y cargos en una deuda de impago, y los prohíbe en las demás', () => {
    const impago: Deuda = {
      ...GREMIO,
      id: 'deuda.impago.salarios',
      dominioId: 'dom.archet',
      contraparteId: 'persona.trabajadores-archet',
      interesPct: 0,
      recurrenciaInteres: undefined,
      vencimiento: undefined,
      notas: undefined,
      impago: true,
      origenImpago: { tipo: 'salarios', id: 'dom.archet' },
      cargos: [{ fecha: { anio: 1640, mes: 4, dia: 10 }, importe: { base: 420000 }, avanceId: 'av.6-10abr' }],
      pagos: [],
      devengos: [],
    }
    expect(EsquemaDeuda.parse(impago)).toEqual(impago)

    const sinOrigen = EsquemaDeuda.safeParse({ ...impago, origenImpago: undefined })
    expect(sinOrigen.success).toBe(false)
    expect(sinOrigen.error?.issues.map((i) => i.message)).toEqual(['Una deuda de impago guarda su origen'])

    const sinCargos = EsquemaDeuda.safeParse({ ...impago, cargos: [] })
    expect(sinCargos.success).toBe(false)
    expect(sinCargos.error?.issues.map((i) => i.message)).toEqual(['Una deuda de impago guarda sus cargos'])

    const normalConCargos = EsquemaDeuda.safeParse({ ...impago, impago: false, interesPct: 0 })
    expect(normalConCargos.success).toBe(false)
    expect(normalConCargos.error?.issues.map((i) => i.message)).toEqual([
      'Solo las deudas de impago llevan origen y cargos',
    ])
  })
})
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/modelo/partida.test.ts src/dominio/modelo/dominios.test.ts src/dominio/modelo/movimientos.test.ts src/dominio/modelo/deudas.test.ts
```

Fallo esperado: los cuatro módulos todavía no existen. La hora, la duración, el orden de los archivos y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/modelo/deudas.test.ts (0 test)
 ❯ src/dominio/modelo/movimientos.test.ts (0 test)
 ❯ src/dominio/modelo/partida.test.ts (0 test)
 ❯ src/dominio/modelo/dominios.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/modelo/deudas.test.ts [ src/dominio/modelo/deudas.test.ts ]
Error: Cannot find module './deudas' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/deudas.test.ts
 ❯ src/dominio/modelo/deudas.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import { EsquemaDeuda, type Deuda } from './deudas'
       | ^
      3|
      4| /** La deuda de Tharan con el Gremio de mercaderes de Bree: 42 mo al 4…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/dominio/modelo/dominios.test.ts [ src/dominio/modelo/dominios.test.ts ]
Error: Cannot find module './dominios' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/dominios.test.ts
 ❯ src/dominio/modelo/dominios.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaCaja,
      4|   EsquemaDominio,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/dominio/modelo/movimientos.test.ts [ src/dominio/modelo/movimientos.test.ts ]
Error: Cannot find module './movimientos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/movimientos.test.ts
 ❯ src/dominio/modelo/movimientos.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaMovimiento,
      4|   EsquemaRecurrenteDinero,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  src/dominio/modelo/partida.test.ts [ src/dominio/modelo/partida.test.ts ]
Error: Cannot find module './partida' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/partida.test.ts
 ❯ src/dominio/modelo/partida.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import { EsquemaPartida, VERSION_FORMATO, hayAvances, type Partida } f…
       | ^
      3|
      4| /** La cabecera de «La Sombra del Este» el 12 de abril de 1640 T.E., q…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  4 failed (4)
      Tests  no tests
   Start at  23:01:01
   Duration  771ms (worker 96%, environment 4%)
```

- [ ] **Paso 3: Implementar `partida.ts`**

Crea `src/dominio/modelo/partida.ts` con este contenido:

```ts
import * as z from 'zod'
import { compararFechas } from '../calendario/fecha'
import {
  EsquemaEdad,
  EsquemaEquivalencias,
  EsquemaFecha,
  EsquemaId,
  EsquemaInstante,
  EsquemaNombreLibre,
  exige,
} from './comunes'

/** Versión del formato del documento y de la copia (§6.1). El formato 1 ya usa Hechizo, TipoLocal y LocalComercial. */
export const VERSION_FORMATO = 1

/** Cabecera de la partida (§8). Va en la raíz del documento; la clave de Dexie es `partida.id` (decisión 6). */
export const EsquemaPartida = z
  .object({
    id: EsquemaId,
    nombre: EsquemaNombreLibre,
    edad: EsquemaEdad,
    equivalencias: EsquemaEquivalencias,
    kgPorSaco: z.literal(30),
    diasPorSaco: z.literal(30),
    fechaInicial: EsquemaFecha,
    fechaActual: EsquemaFecha,
    creada: EsquemaInstante,
    actualizada: EsquemaInstante,
    versionFormato: z.literal(VERSION_FORMATO),
    cambiosDesdeUltimoAvance: z.int().min(0),
  })
  .check(
    exige(
      (p) => compararFechas(p.fechaActual, p.fechaInicial) >= 0,
      'La fecha actual no puede ser anterior a la fecha inicial',
    ),
  )
export type Partida = z.infer<typeof EsquemaPartida>

/** true si la partida ya tuvo algún avance: solo un avance mueve fechaActual (§4, §6.1). */
export function hayAvances(partida: Partida): boolean {
  return compararFechas(partida.fechaActual, partida.fechaInicial) !== 0
}
```

- [ ] **Paso 4: Implementar `dominios.ts`**

Crea `src/dominio/modelo/dominios.ts` con este contenido:

```ts
import * as z from 'zod'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNombreLibre,
  EsquemaNotas,
} from './comunes'

/** El personaje de la partida: solo hay uno (§8). */
export const EsquemaDominioPersonaje = z.object({
  ...CAMPOS_REGISTRO,
  tipo: z.literal('personaje'),
  nombre: EsquemaNombreLibre,
  descripcion: EsquemaNotas.optional(),
})

/** Un asentamiento (§6.3). `alta` es la fecha actual al crearlo, y en P1 la fecha inicial (decisión propia 8). */
export const EsquemaDominioAsentamiento = z.object({
  ...CAMPOS_REGISTRO,
  tipo: z.literal('asentamiento'),
  nombre: EsquemaNombreLibre,
  categoria: z.enum(['aldea', 'pueblo', 'ciudad']),
  alta: EsquemaFecha,
})

export const EsquemaDominio = z.discriminatedUnion('tipo', [EsquemaDominioPersonaje, EsquemaDominioAsentamiento])
export type Dominio = z.infer<typeof EsquemaDominio>
export type DominioPersonaje = z.infer<typeof EsquemaDominioPersonaje>
export type DominioAsentamiento = z.infer<typeof EsquemaDominioAsentamiento>

/** Bolsa del personaje o caja de un asentamiento, una por dominio (§8). El saldo se calcula y no se guarda (§7). */
export const EsquemaCaja = z.object({
  ...CAMPOS_EDICION,
  dominioId: EsquemaId,
  saldoInicial: EsquemaImporteMagnitud,
})
export type Caja = z.infer<typeof EsquemaCaja>
```

- [ ] **Paso 5: Implementar `movimientos.ts`**

Crea `src/dominio/modelo/movimientos.ts` con este contenido:

```ts
import * as z from 'zod'
import {
  CAMPOS_REGISTRO,
  EsquemaAnioMes,
  EsquemaConcepto,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporte,
  EsquemaImporteMagnitud,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaRecurrencia,
  EsquemaUbicacionObjeto,
  exige,
} from './comunes'

/** Registro del que sale un movimiento vinculado; se edita desde ese registro (§8, l. 1211). */
export const EsquemaVinculo = z.object({
  tipo: z.enum([
    'transferencia',
    'venta',
    'altaDeuda',
    'pagoDeuda',
    'capitalInversion',
    'retiradaInversion',
    'obra',
    'caravana',
    'entradaAlmacen',
    'pergamino',
  ]),
  id: EsquemaId,
})
export type Vinculo = z.infer<typeof EsquemaVinculo>

/**
 * Regla recurrente que creó el movimiento; no es un vínculo y cada ocurrencia se edita suelta con J2c (§8).
 * `salarios`, `soldadas` y `locales` apuntan al dominioId del asentamiento, porque el motor agrupa por
 * asentamiento y día (§9 y decisión 16).
 */
export const EsquemaReglaOrigen = z.object({
  tipo: z.enum(['salarios', 'soldadas', 'tributo', 'impuesto', 'recurrente', 'beneficio', 'locales']),
  id: EsquemaId,
})
export type ReglaOrigen = z.infer<typeof EsquemaReglaOrigen>

/** Una entrada por local y mes cobrado, en el cobro agrupado de impuestos de locales (§8, §7). */
export const EsquemaDetalleLocal = z.object({
  localId: EsquemaId.optional(),
  nombre: EsquemaNombreLibre,
  mes: EsquemaAnioMes,
  produccion: EsquemaImporteMagnitud,
  anotada: z.boolean(),
  impuesto: EsquemaImporteMagnitud,
})
export type DetalleLocal = z.infer<typeof EsquemaDetalleLocal>

/** Una entrada por trabajador o por unidad, en el pago agrupado de salarios o de soldadas (decisión 16). */
export const EsquemaDetalleTrabajo = z.object({
  origenId: EsquemaId.optional(),
  nombre: EsquemaNombreLibre,
  numero: z.int().min(1),
  importe: EsquemaImporteMagnitud,
})
export type DetalleTrabajo = z.infer<typeof EsquemaDetalleTrabajo>

/**
 * Objeto que un gasto programado con «Añadir también al inventario» creará al aplicarse (§7, l. 1173).
 * Decisión propia 9: §8 no tiene dónde guardarlo.
 */
export const EsquemaObjetoPendiente = z.object({
  nombre: EsquemaNombreLibre,
  cantidad: z.int().min(1),
  valorUnitario: EsquemaImporteMagnitud,
  ubicacion: EsquemaUbicacionObjeto,
  notas: EsquemaNotas.optional(),
})
export type ObjetoPendiente = z.infer<typeof EsquemaObjetoPendiente>

/** Una fila del libro de una bolsa o de una caja (§8). Es el único importe con signo del modelo (decisión 18). */
export const EsquemaMovimiento = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    fecha: EsquemaFecha,
    tipo: z.enum(['gasto', 'ingreso', 'transferencia']),
    importe: EsquemaImporte,
    categoriaId: EsquemaId,
    concepto: EsquemaConcepto,
    origen: z.enum(['manual', 'avance']),
    avanceId: EsquemaId.optional(),
    vinculo: EsquemaVinculo.optional(),
    regla: EsquemaReglaOrigen.optional(),
    inversionId: EsquemaId.optional(),
    detalleLocales: z.array(EsquemaDetalleLocal).min(1).optional(),
    detalleTrabajo: z.array(EsquemaDetalleTrabajo).min(1).optional(),
    objetoPendiente: EsquemaObjetoPendiente.optional(),
    programado: z.boolean(),
  })
  .check(
    exige((m) => m.origen !== 'avance' || m.avanceId !== undefined, 'Un movimiento del avance guarda su avanceId'),
    exige((m) => m.tipo !== 'gasto' || m.importe.base <= 0, 'El importe de un gasto no puede ser positivo'),
    exige((m) => m.tipo !== 'ingreso' || m.importe.base >= 0, 'El importe de un ingreso no puede ser negativo'),
    exige(
      (m) => (m.tipo === 'transferencia') === (m.vinculo?.tipo === 'transferencia'),
      'Solo un movimiento de transferencia lleva el vínculo «transferencia», y al revés',
    ),
    exige(
      (m) => m.detalleLocales === undefined || m.regla?.tipo === 'locales',
      'El detalle por local solo va en el cobro agrupado de impuestos de locales',
    ),
    exige(
      (m) => m.detalleTrabajo === undefined || m.regla?.tipo === 'salarios' || m.regla?.tipo === 'soldadas',
      'El detalle por trabajador solo va en el pago agrupado de salarios o de soldadas',
    ),
    exige(
      (m) => m.inversionId === undefined || m.regla?.tipo === 'beneficio',
      'inversionId solo va en los beneficios de una inversión',
    ),
    exige(
      (m) => m.objetoPendiente === undefined || (m.tipo === 'gasto' && m.programado),
      'El objeto pendiente solo va en un gasto programado',
    ),
  )
export type Movimiento = z.infer<typeof EsquemaMovimiento>

/** Las dos caras de una transferencia entre dos dominios (§8). Cada lado guarda su concepto en su movimiento. */
export const EsquemaTransferencia = z
  .object({
    ...CAMPOS_REGISTRO,
    fecha: EsquemaFecha,
    importe: EsquemaImporteMagnitud,
    saleDeId: EsquemaId,
    entraEnId: EsquemaId,
    movimientoSaleId: EsquemaId,
    movimientoEntraId: EsquemaId,
  })
  .check(
    exige((t) => t.saleDeId !== t.entraEnId, '«Sale de» y «Entra en» deben ser distintos'),
    exige((t) => t.movimientoSaleId !== t.movimientoEntraId, 'Los dos movimientos de una transferencia son distintos'),
  )
export type Transferencia = z.infer<typeof EsquemaTransferencia>

/**
 * Gasto o ingreso recurrente del personaje (J5, §8). `notas` es la segunda línea que muestra J5 y `unidadDiaria`
 * es la palabra de los conceptos diarios («7 noches» frente a «7 días», §9): decisiones propias 10 y 11.
 */
export const EsquemaRecurrenteDinero = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipo: z.enum(['gasto', 'ingreso']),
  concepto: EsquemaConcepto,
  importe: EsquemaImporteMagnitud,
  categoriaId: EsquemaId,
  cuentaId: EsquemaId,
  recurrencia: EsquemaRecurrencia,
  activo: z.boolean(),
  notas: EsquemaNotas.optional(),
  unidadDiaria: z.string().min(1).max(20).optional(),
})
export type RecurrenteDinero = z.infer<typeof EsquemaRecurrenteDinero>
```

- [ ] **Paso 6: Implementar `deudas.ts`**

Crea `src/dominio/modelo/deudas.ts` con este contenido:

```ts
import * as z from 'zod'
import {
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  exige,
} from './comunes'

/** Un pago o cobro anotado en una deuda (J4b, §8). La cuenta es el dominioId de su movimiento. */
export const EsquemaPagoDeuda = z.object({
  ...CAMPOS_REGISTRO,
  fecha: EsquemaFecha,
  importe: EsquemaImporteMagnitud,
  aplicarA: z.enum(['interesesYCapital', 'soloCapital', 'soloIntereses']),
  movimientoId: EsquemaId,
})
export type PagoDeuda = z.infer<typeof EsquemaPagoDeuda>

/** Un interés ya sumado, con el avance que lo sumó (§7). Un pago con fecha anterior no lo recalcula. */
export const EsquemaDevengo = z.object({
  fecha: EsquemaFecha,
  importe: EsquemaImporteMagnitud,
  avanceId: EsquemaId,
})
export type Devengo = z.infer<typeof EsquemaDevengo>

/**
 * Un impago sumado a una deuda automática: «acumula los impagos sucesivos mientras esté abierta» (§9).
 * Decisión propia 12: §8 solo tiene `principal` y no guarda cada impago.
 */
export const EsquemaCargoImpago = z.object({
  fecha: EsquemaFecha,
  importe: EsquemaImporteMagnitud,
  avanceId: EsquemaId,
})
export type CargoImpago = z.infer<typeof EsquemaCargoImpago>

/** Qué dejó de pagarse (§9). Hay una deuda de impago abierta por origen (decisión propia 12). */
export const EsquemaOrigenImpago = z.object({
  tipo: z.enum(['salarios', 'soldadas', 'tributo', 'recurrente', 'programado']),
  id: EsquemaId,
})
export type OrigenImpago = z.infer<typeof EsquemaOrigenImpago>

/** Deuda o préstamo del personaje (J4) o de un asentamiento (A2b) (§8). */
export const EsquemaDeuda = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    sentido: z.enum(['debo', 'meDeben']),
    contraparteId: EsquemaId,
    fecha: EsquemaFecha,
    principal: EsquemaImporteMagnitud,
    interesPct: EsquemaPorcentaje,
    recurrenciaInteres: EsquemaRecurrencia.optional(),
    vencimiento: EsquemaFecha.optional(),
    notas: EsquemaNotas.optional(),
    estado: z.enum(['abierta', 'vencida', 'saldada']),
    impago: z.boolean(),
    origenImpago: EsquemaOrigenImpago.optional(),
    cargos: z.array(EsquemaCargoImpago).optional(),
    cuentaAltaId: EsquemaId.optional(),
    pagos: z.array(EsquemaPagoDeuda),
    devengos: z.array(EsquemaDevengo),
  })
  .check(
    exige(
      (d) => (d.interesPct > 0) === (d.recurrenciaInteres !== undefined),
      'La frecuencia del interés va si y solo si el interés es mayor que 0',
    ),
    exige((d) => !d.impago || d.origenImpago !== undefined, 'Una deuda de impago guarda su origen'),
    exige((d) => !d.impago || d.interesPct === 0, 'Una deuda de impago no tiene interés'),
    exige((d) => !d.impago || d.vencimiento === undefined, 'Una deuda de impago no tiene vencimiento'),
    exige((d) => !d.impago || (d.cargos !== undefined && d.cargos.length > 0), 'Una deuda de impago guarda sus cargos'),
    exige(
      (d) => d.impago || (d.origenImpago === undefined && d.cargos === undefined),
      'Solo las deudas de impago llevan origen y cargos',
    ),
    exige((d) => d.estado !== 'vencida' || d.vencimiento !== undefined, 'Una deuda vencida guarda su vencimiento'),
  )
export type Deuda = z.infer<typeof EsquemaDeuda>
```

- [ ] **Paso 7: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/modelo/partida.test.ts src/dominio/modelo/dominios.test.ts src/dominio/modelo/movimientos.test.ts src/dominio/modelo/deudas.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  4 passed (4)
      Tests  16 passed (16)
   Start at  23:01:35
   Duration  969ms (import 68%, transform 25%, tests 5%, worker 3%)
```

- [ ] **Paso 8: Comprobar los tipos y todas las pruebas**

Vitest ejecuta las pruebas sin comprobar los tipos; `tsc -b` los comprueba en `src/`, también en las pruebas. Es el paso que detecta que un esquema y su tipo se han separado.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **281 pruebas en 15 archivos**. Son **20 pruebas nuevas**: las 16 de los cuatro archivos de esta tarea y **cuatro más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `partida.ts`, `dominios.ts`, `movimientos.ts` y `deudas.ts`. Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with fsModuleCache: true»), que no es un fallo:

```text
 Test Files  15 passed (15)
      Tests  281 passed (281)
```

- [ ] **Paso 9: Commit**

```bash
git add src/dominio/modelo/partida.ts src/dominio/modelo/partida.test.ts src/dominio/modelo/dominios.ts src/dominio/modelo/dominios.test.ts src/dominio/modelo/movimientos.ts src/dominio/modelo/movimientos.test.ts src/dominio/modelo/deudas.ts src/dominio/modelo/deudas.test.ts
git commit -m "feat(modelo): esquemas de partida, dominios, movimientos y deudas" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/modelo/deudas.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/deudas.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/dominios.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/dominios.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/movimientos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/movimientos.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/partida.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/partida.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 1a2b3c4] feat(modelo): esquemas de partida, dominios, movimientos y deudas
 8 files changed, 681 insertions(+)
 create mode 100644 src/dominio/modelo/deudas.test.ts
 create mode 100644 src/dominio/modelo/deudas.ts
 create mode 100644 src/dominio/modelo/dominios.test.ts
 create mode 100644 src/dominio/modelo/dominios.ts
 create mode 100644 src/dominio/modelo/movimientos.test.ts
 create mode 100644 src/dominio/modelo/movimientos.ts
 create mode 100644 src/dominio/modelo/partida.test.ts
 create mode 100644 src/dominio/modelo/partida.ts
```

---

### Tarea 4 · Esquemas: personaje

Todo lo que el personaje tiene y que no es dinero en la bolsa: el inventario con sus objetos y su ubicación, las ventas, las inversiones en negocios, los hechizos que estudia, cada intento de aprendizaje y los pergaminos. Son siete esquemas en un solo archivo, `src/dominio/modelo/personaje.ts`, y con ellos quedan cubiertas las pantallas J3, J3b, J6, J7, J8 y sus diálogos. La ubicación de un objeto **no** se declara aquí: `EsquemaUbicacionObjeto` vive en `modelo/comunes.ts` (tarea 2), porque también la usa `Movimiento.objetoPendiente`.

**Reglas de la especificación que implementa:**

- **Inventario (§8).** `ObjetoInventario { id, dominioId, nombre, cantidad, valorUnitario: Importe, ubicación: { tipo: encima|caja|almacén|propia, dominioId?, ubicaciónId? }, notas, movimientoCompraId?, archivado? }`. La bolsa no es una ubicación: las cuatro posibles son «Encima», la caja de un dominio, el almacén de un dominio y una ubicación propia de la partida.
- **Archivado con motivo (decisión 13).** `ObjetoInventario.archivado` deja de ser un booleano y guarda por qué: `vendido`, `consumido`, `perdido` o `eliminado`. El filtro «Vendidos» de J3 enseña solo «vendido»; «consumido» y «perdido» los ponen los pergaminos, y «eliminado» es el objeto que el jugador quita y que se conserva archivado porque una venta o un intento lo nombra. Un objeto **sin archivar** tiene al menos 1 unidad; uno archivado puede quedarse en 0.
- **Ventas que sobreviven al objeto (§8, §6.4).** `Venta { id, objetoId, nombre, valorAnotado, cantidad, precioUnitario: Importe, compradorId?, movimientoId }`: si el objeto se elimina, la venta conserva su nombre y su valor, y `objetoId` desaparece. Esa referencia ausente **no** es un error de validación (decisión 14).
- **Inversiones (§8).** `Inversión { … estado: activa|retirada, retirada?: { fecha, importe: Importe, movimientoId } }   // beneficios cobrados = movimientos con su inversiónId y regla beneficio`. La unión por `estado` impide que una inversión activa lleve retirada y que una retirada no la lleve.
- **Hechizos (§8).** `Hechizo { id, dominioId, nombre, lista?, reino?, nivel?, estado: enEstudio|aprendido, aprendidoEl?, notas? }   // nombre único en el personaje; lista, reino y nivel opcionales, solo para ordenar y buscar; varios en estudio a la vez; «aprendido» solo a mano; sin días de estudio`. La unicidad del nombre la comprueba `validacion/unicidades.ts` en la tarea 13, no el esquema.
- **Intentos de aprendizaje (§8, §6.4).** `IntentoAprendizaje { id, hechizoId, fecha, resultado: bueno|malo, pergaminoId?, pergaminoConsumido, notas? }`. El formulario permite anotar un intento «con un pergamino eliminado»: eso se guarda en `pergaminoEliminado`, y entonces el intento ya no guarda `pergaminoId` (decisión propia 14). «El pergamino se consume» solo se marca con un pergamino elegido.
- **Pergaminos (§8).** `Pergamino { id, dominioId, hechizoId?, nombre, nivel?, estado: poseído|consumido|perdido|vendido, consumidoEl?, objetoInventarioId?, movimientoCompraId? }   // hechizo opcional; nombre copiado del hechizo, o escrito si no tiene (de 2 a 60); sin hechizoId si se eliminó su hechizo, con su nombre y consumidoEl; consumido o perdido archiva su objeto`. El nivel va de 1 a 50, como el del hechizo (decisión propia 5).
- **Importes sin signo (decisión 18).** `valorUnitario`, `valorAnotado`, `precioUnitario`, `capital`, `beneficio` y el importe de una retirada son magnitudes: nunca negativas.
- **El dominio es puro (plan de la fase 1).** `personaje.ts` solo importa Zod y `modelo/comunes.ts`. La prueba de pureza de la tarea 1 recorre también este módulo nuevo.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/modelo/personaje.ts`
- Prueba: `src/dominio/modelo/personaje.test.ts`

**Cómo se comportan los `.check()` de Zod 4.6.5** (comprobado): un `exige(...)` que falla **aborta los `.check()` siguientes** del mismo esquema, porque la incidencia se apila sin `continue: true`. Por eso cada `safeParse` de las pruebas espera **un solo mensaje**.

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/dominio/modelo/personaje.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaHechizo,
  EsquemaIntentoAprendizaje,
  EsquemaInversion,
  EsquemaMotivoArchivado,
  EsquemaObjetoInventario,
  EsquemaPergamino,
  EsquemaVenta,
  type Hechizo,
  type IntentoAprendizaje,
  type Inversion,
  type ObjetoInventario,
  type Pergamino,
  type Venta,
} from './personaje'

/** La espada de Tharan: 1 unidad de 18 mo, encima (J3). */
const ESPADA: ObjetoInventario = {
  id: 'obj.espada',
  dominioId: 'dom.tharan',
  nombre: 'Espada larga dúnadan',
  cantidad: 1,
  valorUnitario: { base: 1800000, introducido: { cantidad: '18', moneda: 'mo' } },
  ubicacion: { tipo: 'encima' },
  notas: 'Forjada en Fornost',
}

/** El Tonel Dorado: 50 mo de capital, 25 % de participación y 3 mo el día 1 de cada mes (J6). */
const TONEL: Inversion = {
  id: 'inv.tonel-dorado',
  dominioId: 'dom.tharan',
  negocio: 'El Tonel Dorado',
  descripcion: 'Posada en Archet',
  capital: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
  participacionPct: 25,
  beneficio: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
  recurrencia: { tipo: 'mensual', diaMes: 1 },
  cuentaBeneficiosId: 'dom.tharan',
  estado: 'activa',
}

/** «Luz de Elbereth», en estudio (J7). */
const LUZ: Hechizo = {
  id: 'hech.luz-de-elbereth',
  dominioId: 'dom.tharan',
  nombre: 'Luz de Elbereth',
  lista: 'Caminos de la luz',
  reino: 'esencia',
  nivel: 3,
  estado: 'enEstudio',
}

describe('EsquemaObjetoInventario', () => {
  it('acepta la espada del inventario de Tharan', () => {
    expect(EsquemaObjetoInventario.parse(ESPADA)).toEqual(ESPADA)
  })

  it('admite los cuatro motivos de archivado (decisión 13)', () => {
    expect(EsquemaMotivoArchivado.options).toEqual(['vendido', 'consumido', 'perdido', 'eliminado'])
    for (const archivado of EsquemaMotivoArchivado.options) {
      expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, cantidad: 0, archivado }).success).toBe(true)
    }
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, archivado: 'regalado' }).success).toBe(false)
  })

  it('exige al menos 1 unidad mientras el objeto no está archivado', () => {
    const vacio = EsquemaObjetoInventario.safeParse({ ...ESPADA, cantidad: 0 })
    expect(vacio.success).toBe(false)
    expect(vacio.error?.issues.map((i) => i.message)).toEqual(['Un objeto sin archivar tiene al menos 1 unidad'])
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, cantidad: -1 }).success).toBe(false)
  })

  it('guarda las cuatro ubicaciones posibles de un objeto', () => {
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'encima' } }).success).toBe(true)
    expect(
      EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'caja', dominioId: 'dom.bree' } }).success,
    ).toBe(true)
    expect(
      EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'almacen', dominioId: 'dom.bree' } }).success,
    ).toBe(true)
    expect(
      EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'propia', ubicacionId: 'ubi.posada' } })
        .success,
    ).toBe(true)
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'bolsa' } }).success).toBe(false)
    expect(EsquemaObjetoInventario.safeParse({ ...ESPADA, ubicacion: { tipo: 'caja' } }).success).toBe(false)
  })
})

describe('EsquemaVenta', () => {
  it('acepta una venta con su objeto y otra sin objetoId, de un objeto ya eliminado (§6.4)', () => {
    const venta: Venta = {
      id: 'venta.capa',
      objetoId: 'obj.capa',
      nombre: 'Capa élfica',
      valorAnotado: { base: 1200000 },
      cantidad: 1,
      precioUnitario: { base: 1400000, introducido: { cantidad: '14', moneda: 'mo' } },
      compradorId: 'persona.gremio-bree',
      movimientoId: 'mov.venta.capa',
    }
    expect(EsquemaVenta.parse(venta)).toEqual(venta)

    const sinObjeto: Venta = {
      id: 'venta.daga',
      nombre: 'Daga de Fornost',
      valorAnotado: { base: 300000 },
      cantidad: 2,
      precioUnitario: { base: 200000 },
      movimientoId: 'mov.venta.daga',
    }
    expect(EsquemaVenta.parse(sinObjeto)).toEqual(sinObjeto)
    expect(EsquemaVenta.safeParse({ ...sinObjeto, cantidad: 0 }).success).toBe(false)
  })
})

describe('EsquemaInversion', () => {
  it('acepta una inversión activa', () => {
    expect(EsquemaInversion.parse(TONEL)).toEqual(TONEL)
  })

  it('acepta una inversión retirada con su fecha, su importe y su movimiento', () => {
    const merceria: Inversion = {
      ...TONEL,
      id: 'inv.merceria-staddle',
      negocio: 'Mercería de Staddle',
      descripcion: 'Mercería en Staddle',
      capital: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
      participacionPct: 5,
      beneficio: { base: 0 },
      estado: 'retirada',
      retirada: {
        fecha: { anio: 1640, mes: 2, dia: 3 },
        importe: { base: 900000, introducido: { cantidad: '9', moneda: 'mo' } },
        movimientoId: 'mov.retirada.merceria',
      },
    }
    expect(EsquemaInversion.parse(merceria)).toEqual(merceria)
  })

  it('rechaza una inversión retirada sin su retirada y un estado desconocido', () => {
    expect(EsquemaInversion.safeParse({ ...TONEL, estado: 'retirada' }).success).toBe(false)
    expect(EsquemaInversion.safeParse({ ...TONEL, estado: 'cerrada' }).success).toBe(false)
    expect(EsquemaInversion.safeParse({ ...TONEL, participacionPct: 25.125 }).success).toBe(false)
  })
})

describe('EsquemaHechizo', () => {
  it('acepta un hechizo en estudio y uno aprendido con su fecha', () => {
    expect(EsquemaHechizo.parse(LUZ)).toEqual(LUZ)
    const aprendido: Hechizo = {
      ...LUZ,
      id: 'hech.hablar-con-los-animales',
      nombre: 'Hablar con los animales',
      estado: 'aprendido',
      aprendidoEl: { anio: 1640, mes: 2, dia: 5 },
    }
    expect(EsquemaHechizo.parse(aprendido)).toEqual(aprendido)
  })

  it('ata «Aprendido el» al estado del hechizo', () => {
    const enEstudioConFecha = EsquemaHechizo.safeParse({ ...LUZ, aprendidoEl: { anio: 1640, mes: 2, dia: 5 } })
    expect(enEstudioConFecha.success).toBe(false)
    expect(enEstudioConFecha.error?.issues.map((i) => i.message)).toEqual([
      '«Aprendido el» es obligatorio con «Aprendido» y se borra al volver a «En estudio»',
    ])

    const aprendidoSinFecha = EsquemaHechizo.safeParse({ ...LUZ, estado: 'aprendido' })
    expect(aprendidoSinFecha.success).toBe(false)
    expect(aprendidoSinFecha.error?.issues.map((i) => i.message)).toEqual([
      '«Aprendido el» es obligatorio con «Aprendido» y se borra al volver a «En estudio»',
    ])
    expect(EsquemaHechizo.safeParse({ ...LUZ, nivel: 51 }).success).toBe(false)
  })
})

describe('EsquemaIntentoAprendizaje', () => {
  it('acepta un intento con un pergamino que se consume', () => {
    const intento: IntentoAprendizaje = {
      id: 'int.paso-sin-rastro.28mar',
      hechizoId: 'hech.paso-sin-rastro',
      fecha: { anio: 1640, mes: 3, dia: 28 },
      resultado: 'malo',
      pergaminoId: 'perg.paso-sin-rastro',
      pergaminoConsumido: true,
    }
    expect(EsquemaIntentoAprendizaje.parse(intento)).toEqual(intento)
  })

  it('acepta un intento con un pergamino eliminado y sin pergaminoId (decisión propia 14)', () => {
    const intento: IntentoAprendizaje = {
      id: 'int.luz.25mar',
      hechizoId: 'hech.luz-de-elbereth',
      fecha: { anio: 1640, mes: 3, dia: 25 },
      resultado: 'bueno',
      pergaminoConsumido: false,
      pergaminoEliminado: true,
    }
    expect(EsquemaIntentoAprendizaje.parse(intento)).toEqual(intento)

    const conLosDos = EsquemaIntentoAprendizaje.safeParse({ ...intento, pergaminoId: 'perg.luz-de-elbereth' })
    expect(conLosDos.success).toBe(false)
    expect(conLosDos.error?.issues.map((i) => i.message)).toEqual([
      'Un intento con un pergamino eliminado ya no guarda su pergaminoId',
    ])
  })

  it('solo marca «El pergamino se consume» con un pergamino elegido', () => {
    const sinPergamino = EsquemaIntentoAprendizaje.safeParse({
      id: 'int.luz.3feb',
      hechizoId: 'hech.luz-de-elbereth',
      fecha: { anio: 1640, mes: 2, dia: 3 },
      resultado: 'malo',
      pergaminoConsumido: true,
    })
    expect(sinPergamino.success).toBe(false)
    expect(sinPergamino.error?.issues.map((i) => i.message)).toEqual([
      'Solo se marca «El pergamino se consume» con un pergamino elegido',
    ])
  })
})

describe('EsquemaPergamino', () => {
  it('acepta un pergamino poseído sin hechizoId, con solo su nombre', () => {
    const suelto: Pergamino = {
      id: 'perg.mano-firme',
      dominioId: 'dom.tharan',
      nombre: 'Mano firme',
      estado: 'poseido',
    }
    expect(EsquemaPergamino.parse(suelto)).toEqual(suelto)

    const deLuz: Pergamino = {
      id: 'perg.luz-de-elbereth',
      dominioId: 'dom.tharan',
      hechizoId: 'hech.luz-de-elbereth',
      nombre: 'Luz de Elbereth',
      nivel: 3,
      estado: 'poseido',
      objetoInventarioId: 'obj.pergamino-luz',
    }
    expect(EsquemaPergamino.parse(deLuz)).toEqual(deLuz)
  })

  it('ata la fecha de consumo al estado «consumido»', () => {
    const consumido: Pergamino = {
      id: 'perg.paso-sin-rastro',
      dominioId: 'dom.tharan',
      hechizoId: 'hech.paso-sin-rastro',
      nombre: 'Paso sin rastro',
      nivel: 2,
      estado: 'consumido',
      consumidoEl: { anio: 1640, mes: 3, dia: 28 },
      objetoInventarioId: 'obj.pergamino-paso',
    }
    expect(EsquemaPergamino.parse(consumido)).toEqual(consumido)

    const sinFecha = EsquemaPergamino.safeParse({ ...consumido, consumidoEl: undefined })
    expect(sinFecha.success).toBe(false)
    expect(sinFecha.error?.issues.map((i) => i.message)).toEqual([
      'La fecha de consumo va si y solo si el pergamino está consumido',
    ])
    expect(EsquemaPergamino.safeParse({ ...consumido, estado: 'perdido' }).success).toBe(false)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/modelo/personaje.test.ts
```

Fallo esperado: el módulo `./personaje` todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/modelo/personaje.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/modelo/personaje.test.ts [ src/dominio/modelo/personaje.test.ts ]
Error: Cannot find module './personaje' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/personaje.test.ts
 ❯ src/dominio/modelo/personaje.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaHechizo,
      4|   EsquemaIntentoAprendizaje,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  23:01:13
   Duration  359ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `personaje.ts`**

Crea `src/dominio/modelo/personaje.ts` con este contenido:

```ts
import * as z from 'zod'
import {
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNombreLargo,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  EsquemaUbicacionObjeto,
  exige,
} from './comunes'

/**
 * Por qué un objeto está archivado y fuera del patrimonio (decisión 13). El filtro «Vendidos» de J3 muestra
 * solo «vendido»; «consumido» y «perdido» los ponen los pergaminos; «eliminado» queda reservado para el objeto
 * que el jugador quita del inventario y se conserva archivado porque una venta o un intento lo nombra
 * (decisión propia 13).
 */
export const EsquemaMotivoArchivado = z.enum(['vendido', 'consumido', 'perdido', 'eliminado'])
export type MotivoArchivado = z.infer<typeof EsquemaMotivoArchivado>

/** Una fila del inventario del personaje (§8). */
export const EsquemaObjetoInventario = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLibre,
    cantidad: z.int().min(0),
    valorUnitario: EsquemaImporteMagnitud,
    ubicacion: EsquemaUbicacionObjeto,
    notas: EsquemaNotas.optional(),
    movimientoCompraId: EsquemaId.optional(),
    archivado: EsquemaMotivoArchivado.optional(),
  })
  .check(exige((o) => o.archivado !== undefined || o.cantidad >= 1, 'Un objeto sin archivar tiene al menos 1 unidad'))
export type ObjetoInventario = z.infer<typeof EsquemaObjetoInventario>

/** Venta de unidades de un objeto (§8). Si el objeto se elimina, la venta conserva su nombre y su valor (§6.4). */
export const EsquemaVenta = z.object({
  ...CAMPOS_REGISTRO,
  objetoId: EsquemaId.optional(),
  nombre: EsquemaNombreLibre,
  valorAnotado: EsquemaImporteMagnitud,
  cantidad: z.int().min(1),
  precioUnitario: EsquemaImporteMagnitud,
  compradorId: EsquemaId.optional(),
  movimientoId: EsquemaId,
})
export type Venta = z.infer<typeof EsquemaVenta>

/** Campos comunes de una inversión (§8). El negocio se comparte por nombre normalizado (§6.6, patrón 4). */
const CAMPOS_INVERSION = {
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  negocio: EsquemaNombreLargo,
  descripcion: EsquemaNotas.optional(),
  capital: EsquemaImporteMagnitud,
  participacionPct: EsquemaPorcentaje,
  beneficio: EsquemaImporteMagnitud,
  recurrencia: EsquemaRecurrencia,
  cuentaCapitalId: EsquemaId.optional(),
  cuentaBeneficiosId: EsquemaId,
}

/** Inversión activa o retirada (§8). Los beneficios cobrados son los movimientos con su inversionId. */
export const EsquemaInversion = z.discriminatedUnion('estado', [
  z.object({ ...CAMPOS_INVERSION, estado: z.literal('activa') }),
  z.object({
    ...CAMPOS_INVERSION,
    estado: z.literal('retirada'),
    retirada: z.object({ fecha: EsquemaFecha, importe: EsquemaImporteMagnitud, movimientoId: EsquemaId }),
  }),
])
export type Inversion = z.infer<typeof EsquemaInversion>

/** Un hechizo del personaje (§7, §8). El nombre es único en el personaje. */
export const EsquemaHechizo = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLargo,
    lista: z.string().min(1).max(60).optional(),
    reino: z.enum(['esencia', 'canalizacion', 'mentalismo', 'hibrido']).optional(),
    nivel: z.int().min(1).max(50).optional(),
    estado: z.enum(['enEstudio', 'aprendido']),
    aprendidoEl: EsquemaFecha.optional(),
    notas: EsquemaNotas.optional(),
  })
  .check(
    exige(
      (h) => (h.estado === 'aprendido') === (h.aprendidoEl !== undefined),
      '«Aprendido el» es obligatorio con «Aprendido» y se borra al volver a «En estudio»',
    ),
  )
export type Hechizo = z.infer<typeof EsquemaHechizo>

/**
 * Un intento de aprendizaje (§7, §8). `pergaminoEliminado` guarda «con un pergamino eliminado» (§6.4):
 * decisión propia 14.
 */
export const EsquemaIntentoAprendizaje = z
  .object({
    ...CAMPOS_REGISTRO,
    hechizoId: EsquemaId,
    fecha: EsquemaFecha,
    resultado: z.enum(['bueno', 'malo']),
    pergaminoId: EsquemaId.optional(),
    pergaminoConsumido: z.boolean(),
    pergaminoEliminado: z.boolean().optional(),
    notas: EsquemaNotas.optional(),
  })
  .check(
    exige(
      (i) => !i.pergaminoConsumido || i.pergaminoId !== undefined,
      'Solo se marca «El pergamino se consume» con un pergamino elegido',
    ),
    exige(
      (i) => i.pergaminoEliminado !== true || i.pergaminoId === undefined,
      'Un intento con un pergamino eliminado ya no guarda su pergaminoId',
    ),
  )
export type IntentoAprendizaje = z.infer<typeof EsquemaIntentoAprendizaje>

/** Un pergamino (§7, §8). El valor y la ubicación viven en su objeto del inventario. */
export const EsquemaPergamino = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    hechizoId: EsquemaId.optional(),
    nombre: EsquemaNombreLargo,
    nivel: z.int().min(1).max(50).optional(),
    estado: z.enum(['poseido', 'consumido', 'perdido', 'vendido']),
    consumidoEl: EsquemaFecha.optional(),
    objetoInventarioId: EsquemaId.optional(),
    movimientoCompraId: EsquemaId.optional(),
  })
  .check(
    exige(
      (p) => (p.estado === 'consumido') === (p.consumidoEl !== undefined),
      'La fecha de consumo va si y solo si el pergamino está consumido',
    ),
  )
export type Pergamino = z.infer<typeof EsquemaPergamino>
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/modelo/personaje.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  23:02:09
   Duration  521ms (import 55%, transform 36%, tests 6%, worker 2%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **297 pruebas en 16 archivos**. Son **16 pruebas nuevas**: las 15 de `personaje.test.ts` y **una más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/modelo/personaje.ts`. Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with fsModuleCache: true»), que no es un fallo:

```text
 Test Files  16 passed (16)
      Tests  297 passed (297)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/modelo/personaje.ts src/dominio/modelo/personaje.test.ts
git commit -m "feat(modelo): esquemas del personaje: inventario, ventas, inversiones, hechizos y pergaminos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/modelo/personaje.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/personaje.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 2b3c4d5] feat(modelo): esquemas del personaje: inventario, ventas, inversiones, hechizos y pergaminos
 2 files changed, 412 insertions(+)
 create mode 100644 src/dominio/modelo/personaje.test.ts
 create mode 100644 src/dominio/modelo/personaje.ts
```

---

### Tarea 5 · Esquemas: asentamiento, almacén y comercio

La parte más grande del modelo: todo lo que tiene un asentamiento. Va en tres archivos. `almacen.ts` guarda la población con sus cambios y sus consumos, las existencias, los ajustes a mano, las entradas del almacén y la producción que ya ocurrió (8 esquemas, pantallas A4, A8 y A8b). `asentamiento.ts` guarda los edificios con sus producciones, los trabajadores, las obras, los impuestos y rentas, los tipos de local y los locales comerciales, la guarnición, las defensas, los animales y la armería (16 esquemas, pantallas A3, A3b, A3c, A5, A6, A6b, A7, A7b, A9 y A12). `comercio.ts` guarda los mercados, las rutas y las caravanas (3 esquemas, pantallas A10, A10b y A10c). Los tres son dominio puro; `asentamiento.ts` y `comercio.ts` usan además `compararFechas` de la fase 1 para ordenar tramos y fechas dentro de un registro.

`almacen.ts` y `asentamiento.ts` **no se importan entre sí**: `ProduccionRealizada` guarda solo los ids `edificioId` y `produccionId`, que apuntan a `edificios[]` y a `edificios[].producciones[]` (decisión propia 12 del cuadre).

**Reglas de la especificación que implementa:**

- **Población (§8, §7).** `Población { dominioId, habitantesIniciales, cambios: [{ id, fecha, delta, motivo }], consumos: [{ id, nombre, recursoId, porHabitante }] }   // habitantes = iniciales + cambios hasta la fecha; víveres con la ración de la partida (díasPorSaco); consumo «Leña» con recursoId = Madera`. Las cantidades por habitante llevan hasta 4 decimales (§3).
- **Existencias y ajustes (§8).** `Existencia { dominioId, recursoId, cantidad, capacidad? }   // sustituye a Recurso; sin capacidad = sin límite` y `AjusteExistencias { id, dominioId, recursoId, fecha, delta, motivo }   // solo ajustes a mano; compras y recepciones son EntradaAlmacén`.
- **Entradas del almacén (§8, A8b).** `EntradaAlmacén { id, dominioId, recursoId, cantidad, personas?, días?, operación: compra|recepción, mercadoId?, precioUnidad?, movimientoId?, caravanaId?, fecha }   // sustituye a CompraVíveres`. Una compra guarda su mercado y su precio; una recepción sin coste no guarda ni precio, ni movimiento, ni caravana. «Durante 1 · Meses» se conserva entero (`personas`, `durante` y `periodo`) para poder reabrir A8b igual (decisión propia 16), y `aplicada` distingue la recepción futura que todavía no entró.
- **Producción ya ocurrida con cantidades (decisión 1).** Colección nueva `ProduccionRealizada { id, fecha, edificioId, produccionId, recursoId, cantidad, perdida, avanceId }`, que crea el motor en la fase 4 y que el formato 1 incluye desde ya. No se edita («si es pasada, no se edita: lo producido se corrige con un ajuste», §6.1, P3), así que **no lleva `editadoEl`**.
- **Edificios y producciones (§8).** «producciones sustituye a producción?: 0 o más, cada una con su recurso, cantidad base y frecuencia; acumulado.desde: primer día que puede sumar en el periodo en curso; acumulado.sumaFactores: factores diarios sumados desde ese día». La frecuencia de una producción **no ofrece «Una sola vez»** (§6.4, A7b): por eso usa `EsquemaRecurrenciaProduccion`, la unión de ocho tipos de `comunes.ts`.
- **Obras (§8).** `Obra { … estado: planificada|programada|enCurso|terminada, coste: Importe, materiales: { recursoId: cantidad }, inicio?, díasTotales, efecto: { tipo: crearEdificio|mejorarEdificio|ampliarAlmacén|crearDefensa|repararDefensa|repararEdificio, … }, movimientoId? }`. «efecto: crearEdificio y crearDefensa usan tipoId (toman el nombre de la obra); mejorarEdificio, repararEdificio y repararDefensa usan objetivoId; ampliarAlmacén usa recursoId y valor (capacidad añadida)». `materiales` se queda como `{ recursoId: cantidad }` (decisión 13).
- **`ImpuestoRenta` con categoría (decisión 3).** §8 da `ImpuestoRenta { id, dominioId, sentido: ingreso|tributo, concepto, base: fija|porHabitante, importe: Importe, recurrencia, destinatarioId?, edificioId? }   // edificioId: renta de un edificio alquilado`, y la decisión 3 le añade `categoriaId` **obligatorio**, con valores iniciales `cat.impuestos` (ingreso), `cat.rentas-y-alquileres` (ingreso con `edificioId`) y `cat.tributos` (tributo): es lo único que reproduce las tres categorías que A2 muestra.
- **Locales comerciales con tramos de estado (decisión 13).** §8 tenía `estado: abierto|cerrado` y `estadoDesde`; se sustituyen por `cambiosEstado: [{ desde, estado }]`, con al menos un tramo, en orden y sin dos tramos seguidos del mismo estado. Lo demás se queda: «alta: fecha actual al crearlo; cobradoHasta: al crearlo, el mes anterior al del alta». Del `TipoLocal`: «pct de 0 a 100, con hasta 2 decimales; díaCobro de 1 a 31 (si no existe en el mes, el último día)».
- **Guarnición, defensas, animales y armería (§8).** `UnidadGuarnición { … número, soldada: Importe, recurrencia }`, `Defensa { … estado: buena|dañada|enRuinas }`, `Animal { … género: hembra|macho|mixto, valorUnitario?, notas? }   // tipo + género es único por asentamiento` (la unicidad la comprueba la tarea 13) y `ObjetoArmería { … }   // valor total = cantidad × valorUnitario (se calcula, no se guarda)`.
- **Mercados, rutas y caravanas (§8).** `Mercado { id, partidaId, nombre, localDe?, precios: [{ recursoId, importe: Importe }] }   // localDe: asentamiento del mercado local (lo crea A0 sin precios; lleva el nombre del asentamiento y cambia con él; no se elimina)`. `Ruta` gana el discriminador del destino (decisión 13): §8 solo tenía `destinoId`, sin decir de qué era; los días son «solo de ida», de 1 a 365 (§6.6). En `Caravana`, un traslado guarda su asentamiento de destino y no mueve dinero; una compra o una venta guardan mercado, precio por unidad e importe. El precio de un recurso en un mercado es mayor que 0 (§6.6).
- **El dominio es puro (plan de la fase 1).** Los tres archivos solo importan Zod, `modelo/comunes.ts` y `compararFechas` de `calendario/fecha`. La prueba de pureza de la tarea 1 recorre también estos tres módulos nuevos.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/modelo/almacen.ts`, `src/dominio/modelo/asentamiento.ts`, `src/dominio/modelo/comercio.ts`
- Prueba: `src/dominio/modelo/almacen.test.ts`, `src/dominio/modelo/asentamiento.test.ts`, `src/dominio/modelo/comercio.test.ts`

**Cómo se comportan los `.check()` de Zod 4.6.5** (comprobado): un `exige(...)` que falla **aborta los `.check()` siguientes** del mismo esquema, porque la incidencia se apila sin `continue: true`. Por eso cada `safeParse` de las pruebas espera **un solo mensaje**.

- [ ] **Paso 1: Escribir las tres pruebas que fallan**

Los datos son los de Bree y Archet el 12 de abril de 1640: 1.214 habitantes iniciales y +26 desde enero, 890 sacos de víveres, las Granjas del Oeste con 6 granjeros y 90 sacos cada sábado, el nuevo granero, la herrería y la caravana de Fornost.

Crea `src/dominio/modelo/almacen.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaAjusteExistencias,
  EsquemaCambioPoblacion,
  EsquemaConsumoPorHabitante,
  EsquemaEntradaAlmacen,
  EsquemaExistencia,
  EsquemaPoblacion,
  EsquemaProduccionRealizada,
  type EntradaAlmacen,
  type Existencia,
  type Poblacion,
  type ProduccionRealizada,
} from './almacen'

/** La población de Bree: 1.214 iniciales y +26 desde enero (A4). */
const POBLACION_BREE: Poblacion = {
  dominioId: 'dom.bree',
  habitantesIniciales: 1214,
  cambios: [
    { id: 'pob.enero', fecha: { anio: 1640, mes: 1, dia: 15 }, delta: 12, motivo: 'Llegada de colonos' },
    { id: 'pob.febrero', fecha: { anio: 1640, mes: 2, dia: 10 }, delta: 20, motivo: 'Nacimientos del invierno' },
    { id: 'pob.marzo', fecha: { anio: 1640, mes: 3, dia: 22 }, delta: -6, motivo: 'Incursión de bandidos' },
  ],
  consumos: [
    { id: 'cons.lenia', nombre: 'Leña', recursoId: 'recurso.madera', porHabitante: 0.0125 },
    { id: 'cons.cerveza', nombre: 'Cerveza', recursoId: 'recurso.cerveza', porHabitante: 0.0104 },
  ],
}

/** La compra de víveres del 1 de abril en el mercado local de Bree. */
const COMPRA_VIVERES: EntradaAlmacen = {
  id: 'ent.viveres.1abril',
  dominioId: 'dom.bree',
  recursoId: 'recurso.viveres',
  cantidad: 714,
  operacion: 'compra',
  mercadoId: 'mer.bree',
  precioUnidad: { base: 20000, introducido: { cantidad: '0,2', moneda: 'mo' } },
  movimientoId: 'mov.viveres.1abril',
  fecha: { anio: 1640, mes: 4, dia: 1 },
  aplicada: true,
}

describe('EsquemaPoblacion', () => {
  it('acepta la población de Bree con sus cambios y sus consumos', () => {
    expect(EsquemaPoblacion.parse(POBLACION_BREE)).toEqual(POBLACION_BREE)
    expect(EsquemaPoblacion.safeParse({ ...POBLACION_BREE, habitantesIniciales: -1 }).success).toBe(false)
  })

  it('no admite un cambio de población de 0 habitantes', () => {
    const cambio = { id: 'pob.cero', fecha: { anio: 1640, mes: 1, dia: 15 }, delta: 0, motivo: 'Sin novedad' }
    const cero = EsquemaCambioPoblacion.safeParse(cambio)
    expect(cero.success).toBe(false)
    expect(cero.error?.issues.map((i) => i.message)).toEqual(['El cambio de población no puede ser 0'])
    expect(EsquemaCambioPoblacion.safeParse({ ...cambio, delta: -6 }).success).toBe(true)
  })

  it('guarda el consumo por habitante con hasta 4 decimales y mayor que 0 (§3)', () => {
    const consumo = { id: 'cons.lenia', nombre: 'Leña', recursoId: 'recurso.madera', porHabitante: 0.0125 }
    expect(EsquemaConsumoPorHabitante.parse(consumo)).toEqual(consumo)
    const cincoDecimales = EsquemaConsumoPorHabitante.safeParse({ ...consumo, porHabitante: 0.01255 })
    expect(cincoDecimales.success).toBe(false)
    expect(cincoDecimales.error?.issues.map((i) => i.message)).toEqual(['Usa como mucho 4 decimales'])
    expect(EsquemaConsumoPorHabitante.safeParse({ ...consumo, porHabitante: 0 }).success).toBe(false)
  })
})

describe('EsquemaExistencia y EsquemaAjusteExistencias', () => {
  it('acepta una fila del almacén y un ajuste a mano, y no deja pasar de la capacidad', () => {
    const viveres: Existencia = {
      dominioId: 'dom.bree',
      recursoId: 'recurso.viveres',
      cantidad: 890,
      capacidad: 1000,
    }
    expect(EsquemaExistencia.parse(viveres)).toEqual(viveres)
    expect(EsquemaExistencia.safeParse({ ...viveres, capacidad: undefined, cantidad: 12000 }).success).toBe(true)

    const pasada = EsquemaExistencia.safeParse({ ...viveres, cantidad: 1001 })
    expect(pasada.success).toBe(false)
    expect(pasada.error?.issues.map((i) => i.message)).toEqual(['Las existencias no pueden superar la capacidad'])
    expect(EsquemaExistencia.safeParse({ ...viveres, cantidad: -1 }).success).toBe(false)

    const ajuste = {
      id: 'aj.viveres.5abril',
      dominioId: 'dom.bree',
      recursoId: 'recurso.viveres',
      fecha: { anio: 1640, mes: 4, dia: 5 },
      delta: -12.5,
      motivo: 'Sacos mojados por las lluvias',
    }
    expect(EsquemaAjusteExistencias.parse(ajuste)).toEqual(ajuste)
    const cero = EsquemaAjusteExistencias.safeParse({ ...ajuste, delta: 0 })
    expect(cero.success).toBe(false)
    expect(cero.error?.issues.map((i) => i.message)).toEqual(['El ajuste no puede ser 0'])
  })
})

describe('EsquemaEntradaAlmacen', () => {
  it('acepta una compra con su mercado y su precio, y una recepción sin coste', () => {
    expect(EsquemaEntradaAlmacen.parse(COMPRA_VIVERES)).toEqual(COMPRA_VIVERES)

    const recepcion: EntradaAlmacen = {
      id: 'ent.donacion',
      dominioId: 'dom.archet',
      recursoId: 'recurso.viveres',
      cantidad: 40,
      operacion: 'recepcion',
      fecha: { anio: 1640, mes: 4, dia: 20 },
      aplicada: false,
    }
    expect(EsquemaEntradaAlmacen.parse(recepcion)).toEqual(recepcion)

    const sinMercado = EsquemaEntradaAlmacen.safeParse({ ...COMPRA_VIVERES, mercadoId: undefined })
    expect(sinMercado.success).toBe(false)
    expect(sinMercado.error?.issues.map((i) => i.message)).toEqual([
      'Una compra guarda su mercado y su precio por unidad',
    ])

    const recepcionConPrecio = EsquemaEntradaAlmacen.safeParse({ ...recepcion, precioUnidad: { base: 20000 } })
    expect(recepcionConPrecio.success).toBe(false)
    expect(recepcionConPrecio.error?.issues.map((i) => i.message)).toEqual([
      'Una recepción sin coste no tiene mercado, precio, movimiento ni caravana',
    ])
  })

  it('guarda «Por personas» con sus tres campos, o con ninguno', () => {
    const porPersonas = { ...COMPRA_VIVERES, personas: 1240, durante: 1, periodo: 'meses' as const }
    expect(EsquemaEntradaAlmacen.parse(porPersonas)).toEqual(porPersonas)

    const aMedias = EsquemaEntradaAlmacen.safeParse({ ...porPersonas, periodo: undefined })
    expect(aMedias.success).toBe(false)
    expect(aMedias.error?.issues.map((i) => i.message)).toEqual([
      '«Por personas» guarda a la vez personas, durante y periodo',
    ])

    const dosPagos = EsquemaEntradaAlmacen.safeParse({ ...COMPRA_VIVERES, caravanaId: 'car.tharbad' })
    expect(dosPagos.success).toBe(false)
    expect(dosPagos.error?.issues.map((i) => i.message)).toEqual([
      'Una compra se paga en el mercado local o sale en caravana, no las dos cosas',
    ])
  })
})

describe('EsquemaProduccionRealizada', () => {
  it('guarda lo producido y lo perdido con el avance que lo anotó (decisión 1)', () => {
    const produccion: ProduccionRealizada = {
      id: 'prod.granjas.7abril',
      fecha: { anio: 1640, mes: 4, dia: 7 },
      edificioId: 'ed.granjas-del-oeste',
      produccionId: 'prod.granjas.viveres',
      recursoId: 'recurso.viveres',
      cantidad: 72,
      perdida: 0,
      avanceId: 'av.6-10abr',
    }
    expect(EsquemaProduccionRealizada.parse(produccion)).toEqual(produccion)
    expect(EsquemaProduccionRealizada.parse({ ...produccion, editadoEl: '2026-09-17T18:30:00.000Z' })).toEqual(
      produccion,
    )
    expect(EsquemaProduccionRealizada.safeParse({ ...produccion, perdida: -1 }).success).toBe(false)
    expect(EsquemaProduccionRealizada.safeParse({ ...produccion, avanceId: undefined }).success).toBe(false)
  })
})
```

Crea `src/dominio/modelo/asentamiento.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaAnimal,
  EsquemaDefensa,
  EsquemaEdificio,
  EsquemaEfectoObra,
  EsquemaImpuestoRenta,
  EsquemaLocalComercial,
  EsquemaObjetoArmeria,
  EsquemaObra,
  EsquemaProduccionEdificio,
  EsquemaTipoLocal,
  EsquemaTrabajador,
  EsquemaUnidadGuarnicion,
  type Edificio,
  type ImpuestoRenta,
  type LocalComercial,
  type Obra,
  type Trabajador,
} from './asentamiento'

/** Las Granjas del Oeste de Bree: 6 granjeros y 90 sacos de víveres cada sábado (A7, A7b). */
const GRANJAS: Edificio = {
  id: 'ed.granjas-del-oeste',
  dominioId: 'dom.bree',
  tipoId: 'edificio.granja',
  nombre: 'Granjas del Oeste',
  estado: 'activo',
  trabajadoresNecesarios: 6,
  producciones: [
    {
      id: 'prod.granjas.viveres',
      recursoId: 'recurso.viveres',
      cantidad: 90,
      recurrencia: { tipo: 'semanal', diaSemana: 5 },
      acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 4 },
    },
  ],
}

/** El nuevo granero de Bree: obra programada de 20 días con 40 haces de madera y 20 lingotes de hierro (A9). */
const GRANERO: Obra = {
  id: 'obra.nuevo-granero',
  dominioId: 'dom.bree',
  nombre: 'Nuevo granero',
  estado: 'programada',
  coste: { base: 4500000, introducido: { cantidad: '45', moneda: 'mo' } },
  materiales: { 'recurso.madera': 40, 'recurso.hierro': 20 },
  inicio: { anio: 1640, mes: 4, dia: 10 },
  diasTotales: 20,
  efecto: { tipo: 'crearEdificio', tipoId: 'edificio.granero' },
  movimientoId: 'mov.obra.granero',
}

/** La herrería de Bree: 15 % de la producción, mínimo 1 mo, se cobra el día 1 (A3b). */
const HERRERIA: LocalComercial = {
  id: 'loc.herreria-1',
  dominioId: 'dom.bree',
  nombre: 'Herrería de Bree',
  tipoId: 'tipoloc.herreria',
  titularId: 'persona.hamfast',
  produccionHabitual: { base: 3000000, introducido: { cantidad: '30', moneda: 'mo' } },
  cambiosEstado: [{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }],
  alta: { anio: 1640, mes: 3, dia: 1 },
  cobradoHasta: { anio: 1640, mes: 2 },
  producciones: [{ mes: { anio: 1640, mes: 3 }, importe: { base: 2800000 }, nota: 'Mes flojo' }],
}

describe('EsquemaEdificio', () => {
  it('acepta las Granjas del Oeste con su producción semanal y su acumulado', () => {
    expect(EsquemaEdificio.parse(GRANJAS)).toEqual(GRANJAS)
    expect(EsquemaEdificio.safeParse({ ...GRANJAS, estado: 'daniado' }).success).toBe(true)
    expect(EsquemaEdificio.safeParse({ ...GRANJAS, estado: 'dañado' }).success).toBe(false)
    expect(
      EsquemaEdificio.safeParse({
        ...GRANJAS,
        avisoPendiente: { tipo: 'terminadoSinProduccion', obraId: 'obra.nuevo-granero' },
      }).success,
    ).toBe(true)
  })

  it('no admite la frecuencia «Una sola vez» en una producción (§6.4, A7b)', () => {
    const unica = EsquemaProduccionEdificio.safeParse({
      ...GRANJAS.producciones[0],
      recurrencia: { tipo: 'unica', fecha: { anio: 1640, mes: 4, dia: 8 } },
    })
    expect(unica.success).toBe(false)

    expect(EsquemaProduccionEdificio.safeParse({ ...GRANJAS.producciones[0], cantidad: 0 }).success).toBe(false)
    const tresDecimales = EsquemaProduccionEdificio.safeParse({ ...GRANJAS.producciones[0], cantidad: 8.333 })
    expect(tresDecimales.success).toBe(false)
    expect(tresDecimales.error?.issues.map((i) => i.message)).toEqual(['Usa como mucho 2 decimales'])
  })
})

describe('EsquemaTrabajador', () => {
  it('acepta los seis granjeros con su salario por trabajador y su edificio', () => {
    const granjeros: Trabajador = {
      id: 'trab.granjeros',
      dominioId: 'dom.bree',
      oficioId: 'oficio.granjero',
      numero: 6,
      salario: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      recurrencia: { tipo: 'mensual', diaMes: 13 },
      edificioId: 'ed.granjas-del-oeste',
    }
    expect(EsquemaTrabajador.parse(granjeros)).toEqual(granjeros)
    expect(EsquemaTrabajador.safeParse({ ...granjeros, numero: 0 }).success).toBe(false)
    expect(EsquemaTrabajador.safeParse({ ...granjeros, salario: { base: -1 } }).success).toBe(false)
  })
})

describe('EsquemaObra', () => {
  it('acepta el nuevo granero con sus materiales como { recursoId: cantidad } y ata inicio y movimiento al estado', () => {
    expect(EsquemaObra.parse(GRANERO)).toEqual(GRANERO)
    expect(EsquemaObra.parse({ ...GRANERO, materiales: {} }).materiales).toEqual({})
    expect(EsquemaObra.safeParse({ ...GRANERO, materiales: { 'recurso.madera': 0 } }).success).toBe(false)
    expect(EsquemaObra.safeParse({ ...GRANERO, materiales: { 'recurso madera': 40 } }).success).toBe(false)

    const planificada = {
      ...GRANERO,
      id: 'obra.muralla',
      estado: 'planificada' as const,
      inicio: undefined,
      movimientoId: undefined,
    }
    expect(EsquemaObra.parse(planificada)).toEqual(planificada)

    const planificadaConInicio = EsquemaObra.safeParse({ ...planificada, inicio: { anio: 1640, mes: 5, dia: 1 } })
    expect(planificadaConInicio.success).toBe(false)
    expect(planificadaConInicio.error?.issues.map((i) => i.message)).toEqual([
      'Solo una obra planificada no tiene fecha de inicio',
    ])

    const planificadaConMovimiento = EsquemaObra.safeParse({ ...planificada, movimientoId: 'mov.obra.muralla' })
    expect(planificadaConMovimiento.success).toBe(false)
    expect(planificadaConMovimiento.error?.issues.map((i) => i.message)).toEqual([
      'Una obra planificada no ha descontado nada todavía',
    ])
  })

  it('admite los seis resultados de una obra, cada uno con su campo (selector n.º 19)', () => {
    const efectos = [
      { tipo: 'crearEdificio', tipoId: 'edificio.granero' },
      { tipo: 'mejorarEdificio', objetivoId: 'ed.granjas-del-oeste' },
      { tipo: 'ampliarAlmacen', recursoId: 'recurso.viveres', valor: 500 },
      { tipo: 'crearDefensa', tipoId: 'defensa.torre-de-vigia' },
      { tipo: 'repararDefensa', objetivoId: 'def.empalizada' },
      { tipo: 'repararEdificio', objetivoId: 'ed.aserradero' },
    ]
    for (const efecto of efectos) {
      expect(EsquemaEfectoObra.parse(efecto)).toEqual(efecto)
    }
    expect(EsquemaEfectoObra.safeParse({ tipo: 'crearEdificio', objetivoId: 'ed.aserradero' }).success).toBe(false)
    expect(EsquemaEfectoObra.safeParse({ tipo: 'derribarEdificio', objetivoId: 'ed.aserradero' }).success).toBe(false)
  })
})

describe('EsquemaImpuestoRenta', () => {
  it('exige categoriaId y coloca destinatario y edificio en su sentido (decisión 3)', () => {
    const peaje: ImpuestoRenta = {
      id: 'imp.peaje',
      dominioId: 'dom.bree',
      sentido: 'ingreso',
      concepto: 'Peaje del camino',
      base: 'fija',
      importe: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      categoriaId: 'cat.impuestos',
      recurrencia: { tipo: 'diaria' },
    }
    expect(EsquemaImpuestoRenta.parse(peaje)).toEqual(peaje)
    expect(EsquemaImpuestoRenta.safeParse({ ...peaje, categoriaId: undefined }).success).toBe(false)

    const conDestinatario = EsquemaImpuestoRenta.safeParse({ ...peaje, destinatarioId: 'persona.rey' })
    expect(conDestinatario.success).toBe(false)
    expect(conDestinatario.error?.issues.map((i) => i.message)).toEqual(['El destinatario solo va en los tributos'])

    const tributoConEdificio = EsquemaImpuestoRenta.safeParse({
      ...peaje,
      sentido: 'tributo',
      categoriaId: 'cat.tributos',
      edificioId: 'ed.casa-archet',
    })
    expect(tributoConEdificio.success).toBe(false)
    expect(tributoConEdificio.error?.issues.map((i) => i.message)).toEqual([
      'El edificio alquilado solo va en los ingresos',
    ])
  })
})

describe('EsquemaTipoLocal y EsquemaLocalComercial', () => {
  it('acepta el tipo «Herrería» y su local con cambiosEstado[] (decisión 13)', () => {
    const tipo = {
      id: 'tipoloc.herreria',
      dominioId: 'dom.bree',
      nombre: 'Herrería',
      pct: 15,
      minimo: { base: 100000, introducido: { cantidad: '1', moneda: 'mo' } },
      diaCobro: 1,
    }
    expect(EsquemaTipoLocal.parse(tipo)).toEqual(tipo)
    expect(EsquemaTipoLocal.safeParse({ ...tipo, diaCobro: 32 }).success).toBe(false)
    expect(EsquemaTipoLocal.safeParse({ ...tipo, pct: 100.5 }).success).toBe(false)

    expect(EsquemaLocalComercial.parse(HERRERIA)).toEqual(HERRERIA)
    expect(EsquemaLocalComercial.safeParse({ ...HERRERIA, cambiosEstado: [] }).success).toBe(false)
  })

  it('exige que los tramos de estado vayan en orden y alternando abierto y cerrado', () => {
    const desordenados = EsquemaLocalComercial.safeParse({
      ...HERRERIA,
      cambiosEstado: [
        { desde: { anio: 1640, mes: 4, dia: 1 }, estado: 'cerrado' },
        { desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' },
      ],
    })
    expect(desordenados.success).toBe(false)
    expect(desordenados.error?.issues.map((i) => i.message)).toEqual([
      'Los cambios de estado del local van en orden y sin repetir fecha',
    ])

    const repetidos = EsquemaLocalComercial.safeParse({
      ...HERRERIA,
      cambiosEstado: [
        { desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' },
        { desde: { anio: 1640, mes: 4, dia: 1 }, estado: 'abierto' },
      ],
    })
    expect(repetidos.success).toBe(false)
    expect(repetidos.error?.issues.map((i) => i.message)).toEqual([
      'Dos tramos seguidos de un local no pueden tener el mismo estado',
    ])
  })
})

describe('guarnición, defensas, animales y armería', () => {
  it('acepta una unidad, una defensa, una fila de animales y una de la armería', () => {
    const unidad = {
      id: 'uni.guardia-bree',
      dominioId: 'dom.bree',
      tipoId: 'unidad.guardia',
      nombre: 'Guardia de Bree',
      numero: 12,
      soldada: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
      recurrencia: { tipo: 'mensual' as const, diaMes: 10 },
    }
    expect(EsquemaUnidadGuarnicion.parse(unidad)).toEqual(unidad)

    const defensa = {
      id: 'def.empalizada',
      dominioId: 'dom.bree',
      tipoId: 'defensa.empalizada',
      nombre: 'Empalizada del norte',
      estado: 'buena' as const,
    }
    expect(EsquemaDefensa.parse(defensa)).toEqual(defensa)
    expect(EsquemaDefensa.safeParse({ ...defensa, estado: 'daniada' }).success).toBe(true)
    expect(EsquemaDefensa.safeParse({ ...defensa, estado: 'rota' }).success).toBe(false)

    const animales = {
      id: 'ani.vacas',
      dominioId: 'dom.bree',
      tipoId: 'animal.vaca',
      cantidad: 24,
      genero: 'hembra' as const,
      valorUnitario: { base: 500000, introducido: { cantidad: '5', moneda: 'mo' } },
    }
    expect(EsquemaAnimal.parse(animales)).toEqual(animales)
    expect(EsquemaAnimal.safeParse({ ...animales, genero: 'mixto' }).success).toBe(true)
    expect(EsquemaAnimal.safeParse({ ...animales, cantidad: 0 }).success).toBe(false)

    const armeria = {
      id: 'arm.lanzas',
      dominioId: 'dom.bree',
      nombre: 'Lanzas',
      cantidad: 30,
      valorUnitario: { base: 50000 },
    }
    expect(EsquemaObjetoArmeria.parse(armeria)).toEqual(armeria)
  })
})
```

Crea `src/dominio/modelo/comercio.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaCaravana,
  EsquemaMercado,
  EsquemaPrecioMercado,
  EsquemaRuta,
  type Caravana,
  type Mercado,
  type Ruta,
} from './comercio'

/** El mercado de Fornost, a 4 días de Bree (A10, A10c). */
const FORNOST: Mercado = {
  id: 'mer.fornost',
  nombre: 'Fornost',
  precios: [
    { recursoId: 'recurso.piedra', importe: { base: 25000, introducido: { cantidad: '0,25', moneda: 'mo' } } },
    { recursoId: 'recurso.cerveza', importe: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } } },
  ],
}

/** La caravana que vende 40 barriles de cerveza en Fornost y vuelve el 18 de abril (A10b). */
const CARAVANA_FORNOST: Caravana = {
  id: 'car.fornost.abril',
  dominioId: 'dom.bree',
  operacion: 'venta',
  mercadoId: 'mer.fornost',
  carga: { recursoId: 'recurso.cerveza', cantidad: 40 },
  precioUnidad: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
  importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
  salida: { anio: 1640, mes: 4, dia: 10 },
  vuelta: { anio: 1640, mes: 4, dia: 18 },
  estado: 'enRuta',
}

describe('EsquemaMercado', () => {
  it('acepta el mercado local de Bree, sin precios, y el de Fornost con los suyos', () => {
    expect(EsquemaMercado.parse(FORNOST)).toEqual(FORNOST)

    const local: Mercado = { id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }
    expect(EsquemaMercado.parse(local)).toEqual(local)
    expect(EsquemaMercado.safeParse({ ...local, nombre: 'B' }).success).toBe(false)
  })

  it('exige que el precio de un recurso sea mayor que 0 (§6.6)', () => {
    const cero = EsquemaPrecioMercado.safeParse({ recursoId: 'recurso.piedra', importe: { base: 0 } })
    expect(cero.success).toBe(false)
    expect(cero.error?.issues.map((i) => i.message)).toEqual(['El precio debe ser mayor que 0'])
    expect(EsquemaMercado.safeParse({ ...FORNOST, precios: [{ recursoId: 'recurso.piedra', importe: { base: -1 } }] }).success).toBe(
      false,
    )
  })
})

describe('EsquemaRuta', () => {
  it('guarda el destino con discriminador y los días de viaje de 1 a 365 (decisión 13)', () => {
    const aFornost: Ruta = {
      origenId: 'dom.bree',
      destino: { tipo: 'mercado', id: 'mer.fornost' },
      diasViaje: 4,
    }
    expect(EsquemaRuta.parse(aFornost)).toEqual(aFornost)

    const aArchet: Ruta = {
      origenId: 'dom.bree',
      destino: { tipo: 'asentamiento', id: 'dom.archet' },
      diasViaje: 1,
    }
    expect(EsquemaRuta.parse(aArchet)).toEqual(aArchet)

    expect(EsquemaRuta.safeParse({ ...aFornost, destino: { tipo: 'aldea', id: 'dom.archet' } }).success).toBe(false)
    expect(EsquemaRuta.safeParse({ ...aFornost, destino: { id: 'mer.fornost' } }).success).toBe(false)
    expect(EsquemaRuta.safeParse({ ...aFornost, diasViaje: 0 }).success).toBe(false)
    expect(EsquemaRuta.safeParse({ ...aFornost, diasViaje: 366 }).success).toBe(false)
  })
})

describe('EsquemaCaravana', () => {
  it('acepta la venta de cerveza en Fornost con su mercado, su precio y su importe', () => {
    expect(EsquemaCaravana.parse(CARAVANA_FORNOST)).toEqual(CARAVANA_FORNOST)

    const sinPrecio = EsquemaCaravana.safeParse({ ...CARAVANA_FORNOST, precioUnidad: undefined })
    expect(sinPrecio.success).toBe(false)
    expect(sinPrecio.error?.issues.map((i) => i.message)).toEqual([
      'Una compra o una venta guardan su mercado, su precio por unidad y su importe',
    ])

    const conDestino = EsquemaCaravana.safeParse({ ...CARAVANA_FORNOST, destinoId: 'dom.archet' })
    expect(conDestino.success).toBe(false)
    expect(conDestino.error?.issues.map((i) => i.message)).toEqual(['Solo un traslado tiene asentamiento de destino'])
  })

  it('acepta un traslado, que no mueve dinero, y exige que la vuelta no sea anterior a la salida', () => {
    const traslado: Caravana = {
      id: 'car.traslado.archet',
      dominioId: 'dom.bree',
      operacion: 'traslado',
      destinoId: 'dom.archet',
      carga: { recursoId: 'recurso.viveres', cantidad: 120 },
      salida: { anio: 1640, mes: 4, dia: 11 },
      vuelta: { anio: 1640, mes: 4, dia: 12 },
      estado: 'programada',
    }
    expect(EsquemaCaravana.parse(traslado)).toEqual(traslado)

    const conDinero = EsquemaCaravana.safeParse({ ...traslado, importe: { base: 100000 } })
    expect(conDinero.success).toBe(false)
    expect(conDinero.error?.issues.map((i) => i.message)).toEqual([
      'Un traslado guarda su asentamiento de destino y no mueve dinero',
    ])

    const alMismoSitio = EsquemaCaravana.safeParse({ ...traslado, destinoId: 'dom.bree' })
    expect(alMismoSitio.success).toBe(false)
    expect(alMismoSitio.error?.issues.map((i) => i.message)).toEqual([
      'Un traslado no puede ir al mismo asentamiento del que sale',
    ])

    const alReves = EsquemaCaravana.safeParse({ ...traslado, vuelta: { anio: 1640, mes: 4, dia: 10 } })
    expect(alReves.success).toBe(false)
    expect(alReves.error?.issues.map((i) => i.message)).toEqual(['La vuelta no puede ser anterior a la salida'])
  })
})
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/modelo/almacen.test.ts src/dominio/modelo/asentamiento.test.ts src/dominio/modelo/comercio.test.ts
```

Fallo esperado: los tres módulos todavía no existen. La hora, la duración, el orden de los archivos y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/modelo/almacen.test.ts (0 test)
 ❯ src/dominio/modelo/asentamiento.test.ts (0 test)
 ❯ src/dominio/modelo/comercio.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/modelo/almacen.test.ts [ src/dominio/modelo/almacen.test.ts ]
Error: Cannot find module './almacen' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/almacen.test.ts
 ❯ src/dominio/modelo/almacen.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaAjusteExistencias,
      4|   EsquemaCambioPoblacion,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  src/dominio/modelo/asentamiento.test.ts [ src/dominio/modelo/asentamiento.test.ts ]
Error: Cannot find module './asentamiento' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/asentamiento.test.ts
 ❯ src/dominio/modelo/asentamiento.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaAnimal,
      4|   EsquemaDefensa,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  src/dominio/modelo/comercio.test.ts [ src/dominio/modelo/comercio.test.ts ]
Error: Cannot find module './comercio' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/comercio.test.ts
 ❯ src/dominio/modelo/comercio.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaCaravana,
      4|   EsquemaMercado,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  3 failed (3)
      Tests  no tests
   Start at  23:01:16
   Duration  645ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `almacen.ts`**

Crea `src/dominio/modelo/almacen.ts` con este contenido:

```ts
import * as z from 'zod'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaCantidadRecurso,
  EsquemaConcepto,
  EsquemaFecha,
  EsquemaId,
  EsquemaImportePositivo,
  EsquemaNombreLibre,
  decimalesComoMucho,
  exige,
} from './comunes'

// ---- Población (A4) -------------------------------------------------------

/** Un cambio de población con fecha y motivo (§6.4). Los habitantes son los iniciales más los cambios hasta el día (§7). */
export const EsquemaCambioPoblacion = z
  .object({
    ...CAMPOS_REGISTRO,
    fecha: EsquemaFecha,
    delta: z.int(),
    motivo: EsquemaConcepto,
  })
  .check(exige((c) => c.delta !== 0, 'El cambio de población no puede ser 0'))
export type CambioPoblacion = z.infer<typeof EsquemaCambioPoblacion>

/** Consumo por habitante y día de un recurso que no son los víveres (§6.4, §7). Hasta 4 decimales (§3). */
export const EsquemaConsumoPorHabitante = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLibre,
  recursoId: EsquemaId,
  porHabitante: z.number().gt(0).check(decimalesComoMucho(4)),
})
export type ConsumoPorHabitante = z.infer<typeof EsquemaConsumoPorHabitante>

/** La población de un asentamiento, una por dominio (§8). */
export const EsquemaPoblacion = z.object({
  ...CAMPOS_EDICION,
  dominioId: EsquemaId,
  habitantesIniciales: z.int().min(0),
  cambios: z.array(EsquemaCambioPoblacion),
  consumos: z.array(EsquemaConsumoPorHabitante),
})
export type Poblacion = z.infer<typeof EsquemaPoblacion>

// ---- Almacén (A8) ---------------------------------------------------------

/** Lo que hay de un recurso en el almacén de un asentamiento (§8). Sin capacidad, no hay límite. */
export const EsquemaExistencia = z
  .object({
    ...CAMPOS_EDICION,
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    cantidad: EsquemaCantidadRecurso,
    capacidad: z.number().gt(0).optional(),
  })
  .check(
    exige(
      (e) => e.capacidad === undefined || e.cantidad <= e.capacidad,
      'Las existencias no pueden superar la capacidad',
    ),
  )
export type Existencia = z.infer<typeof EsquemaExistencia>

/** Ajuste a mano de las existencias, siempre con motivo (§6.4, §8). Nunca deja la cantidad por debajo de 0 (§6.4). */
export const EsquemaAjusteExistencias = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    fecha: EsquemaFecha,
    delta: z.number(),
    motivo: EsquemaConcepto,
  })
  .check(exige((a) => a.delta !== 0, 'El ajuste no puede ser 0'))
export type AjusteExistencias = z.infer<typeof EsquemaAjusteExistencias>

/** Periodo del campo «Durante» al añadir víveres (selector n.º 30): días, semanas (7), meses (30) y años (365). */
export const EsquemaPeriodoViveres = z.enum(['dias', 'semanas', 'meses', 'anios'])
export type PeriodoViveres = z.infer<typeof EsquemaPeriodoViveres>

/**
 * Compra o recepción sin coste de existencias (§8, A8b). `aplicada` distingue una recepción futura que aún no
 * entró (no tiene movimiento que lo diga) y `durante`/`periodo` guardan «Durante 1 · Meses» para poder reabrir
 * A8b igual: decisión propia 16.
 */
export const EsquemaEntradaAlmacen = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    cantidad: z.number().gt(0),
    personas: z.int().min(1).optional(),
    durante: z.int().min(1).optional(),
    periodo: EsquemaPeriodoViveres.optional(),
    operacion: z.enum(['compra', 'recepcion']),
    mercadoId: EsquemaId.optional(),
    precioUnidad: EsquemaImportePositivo.optional(),
    movimientoId: EsquemaId.optional(),
    caravanaId: EsquemaId.optional(),
    fecha: EsquemaFecha,
    aplicada: z.boolean(),
  })
  .check(
    exige(
      (e) => e.operacion !== 'compra' || (e.mercadoId !== undefined && e.precioUnidad !== undefined),
      'Una compra guarda su mercado y su precio por unidad',
    ),
    exige(
      (e) =>
        e.operacion !== 'recepcion' ||
        (e.mercadoId === undefined &&
          e.precioUnidad === undefined &&
          e.movimientoId === undefined &&
          e.caravanaId === undefined),
      'Una recepción sin coste no tiene mercado, precio, movimiento ni caravana',
    ),
    exige(
      (e) =>
        (e.personas === undefined) === (e.durante === undefined) &&
        (e.durante === undefined) === (e.periodo === undefined),
      '«Por personas» guarda a la vez personas, durante y periodo',
    ),
    exige(
      (e) => e.movimientoId === undefined || e.caravanaId === undefined,
      'Una compra se paga en el mercado local o sale en caravana, no las dos cosas',
    ),
  )
export type EntradaAlmacen = z.infer<typeof EsquemaEntradaAlmacen>

// ---- Producción ya ocurrida (P3) ------------------------------------------

/**
 * Una ocurrencia de producción ya ocurrida, con lo que entró y lo que se perdió por capacidad (decisión 1).
 * La crea el motor en la fase 4 y el formato 1 la incluye desde ya. No se edita (§6.1, P3: «si es pasada,
 * no se edita: lo producido se corrige con un ajuste»), así que no lleva `editadoEl`: decisión propia 18.
 * `edificioId` y `produccionId` apuntan a `edificios[]` y a `edificios[].producciones[]`, que viven en
 * `asentamiento.ts`; aquí solo se guardan los ids, así que no hay import entre los dos archivos.
 */
export const EsquemaProduccionRealizada = z.object({
  id: EsquemaId,
  fecha: EsquemaFecha,
  edificioId: EsquemaId,
  produccionId: EsquemaId,
  recursoId: EsquemaId,
  cantidad: EsquemaCantidadRecurso,
  perdida: EsquemaCantidadRecurso,
  avanceId: EsquemaId,
})
export type ProduccionRealizada = z.infer<typeof EsquemaProduccionRealizada>
```

- [ ] **Paso 4: Implementar `asentamiento.ts`**

Crea `src/dominio/modelo/asentamiento.ts` con este contenido:

```ts
import * as z from 'zod'
import { compararFechas } from '../calendario/fecha'
import {
  CAMPOS_REGISTRO,
  EsquemaAnioMes,
  EsquemaConcepto,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaNombreCorto,
  EsquemaNombreLibre,
  EsquemaNotas,
  EsquemaPorcentaje,
  EsquemaRecurrencia,
  EsquemaRecurrenciaProduccion,
  decimalesComoMucho,
  exige,
} from './comunes'

// ---- Edificios y producción (A7, A7b) -------------------------------------

/** Lo acumulado del periodo en curso de una producción (§7, §8). */
export const EsquemaAcumuladoProduccion = z.object({
  desde: EsquemaFecha,
  sumaFactores: z.number().min(0),
})
export type AcumuladoProduccion = z.infer<typeof EsquemaAcumuladoProduccion>

/** Una producción de un edificio: recurso, cantidad base y frecuencia (§8). Cantidad > 0 con hasta 2 decimales (§6.4). */
export const EsquemaProduccionEdificio = z.object({
  id: EsquemaId,
  recursoId: EsquemaId,
  cantidad: z.number().gt(0).check(decimalesComoMucho(2)),
  recurrencia: EsquemaRecurrenciaProduccion,
  acumulado: EsquemaAcumuladoProduccion,
})
export type ProduccionEdificio = z.infer<typeof EsquemaProduccionEdificio>

/** Aviso ámbar que dura «hasta guardar el edificio en A7b» (§7, tabla de avisos de §9): decisión propia 17. */
export const EsquemaAvisoPendienteEdificio = z.object({
  tipo: z.enum(['terminadoSinProduccion', 'mejoraTerminada']),
  obraId: EsquemaId,
})
export type AvisoPendienteEdificio = z.infer<typeof EsquemaAvisoPendienteEdificio>

/** Un edificio del asentamiento (§8). Alquilado conserva ocultas sus producciones y su acumulado (§7). */
export const EsquemaEdificio = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  nombre: EsquemaNombreLibre,
  estado: z.enum(['activo', 'daniado', 'inactivo', 'alquilado']),
  trabajadoresNecesarios: z.int().min(0),
  producciones: z.array(EsquemaProduccionEdificio),
  avisoPendiente: EsquemaAvisoPendienteEdificio.optional(),
})
export type Edificio = z.infer<typeof EsquemaEdificio>

// ---- Trabajadores y obras (A5, A9) ----------------------------------------

/** Una fila de trabajadores contratados (§8). El salario es por trabajador (A5): decisión propia 19. */
export const EsquemaTrabajador = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  oficioId: EsquemaId,
  numero: z.int().min(1),
  salario: EsquemaImporteMagnitud,
  recurrencia: EsquemaRecurrencia,
  edificioId: EsquemaId.optional(),
})
export type Trabajador = z.infer<typeof EsquemaTrabajador>

/** Qué deja hecha una obra al terminar (§8, selector n.º 19). La unión fija qué campo usa cada resultado. */
export const EsquemaEfectoObra = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('crearEdificio'), tipoId: EsquemaId }),
  z.object({ tipo: z.literal('mejorarEdificio'), objetivoId: EsquemaId }),
  z.object({ tipo: z.literal('ampliarAlmacen'), recursoId: EsquemaId, valor: z.number().gt(0) }),
  z.object({ tipo: z.literal('crearDefensa'), tipoId: EsquemaId }),
  z.object({ tipo: z.literal('repararDefensa'), objetivoId: EsquemaId }),
  z.object({ tipo: z.literal('repararEdificio'), objetivoId: EsquemaId }),
])
export type EfectoObra = z.infer<typeof EsquemaEfectoObra>

/** Una obra (§7, §8). Fin = inicio + diasTotales − 1. `materiales` se queda como { recursoId: cantidad } (decisión 13). */
export const EsquemaObra = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLibre,
    estado: z.enum(['planificada', 'programada', 'enCurso', 'terminada']),
    coste: EsquemaImporteMagnitud,
    materiales: z.record(EsquemaId, z.number().gt(0)),
    inicio: EsquemaFecha.optional(),
    diasTotales: z.int().min(1),
    efecto: EsquemaEfectoObra,
    movimientoId: EsquemaId.optional(),
  })
  .check(
    exige(
      (o) => (o.estado === 'planificada') === (o.inicio === undefined),
      'Solo una obra planificada no tiene fecha de inicio',
    ),
    exige(
      (o) => o.estado !== 'planificada' || o.movimientoId === undefined,
      'Una obra planificada no ha descontado nada todavía',
    ),
  )
export type Obra = z.infer<typeof EsquemaObra>

// ---- Impuestos, rentas y locales comerciales (A3, A3b, A3c) ---------------

/**
 * Ingreso, renta o tributo recurrente de un asentamiento (§8). `categoriaId` es lo único que reproduce las tres
 * categorías que A2 muestra en sus movimientos automáticos: Impuestos, Rentas y alquileres y Aranceles
 * (decisión 3). Valor inicial: cat.impuestos (ingreso), cat.rentas-y-alquileres (ingreso con edificioId) y
 * cat.tributos (tributo); editable en el formulario «Ingreso o tributo».
 */
export const EsquemaImpuestoRenta = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    sentido: z.enum(['ingreso', 'tributo']),
    concepto: EsquemaConcepto,
    base: z.enum(['fija', 'porHabitante']),
    importe: EsquemaImporteMagnitud,
    categoriaId: EsquemaId,
    recurrencia: EsquemaRecurrencia,
    destinatarioId: EsquemaId.optional(),
    edificioId: EsquemaId.optional(),
  })
  .check(
    exige((i) => i.destinatarioId === undefined || i.sentido === 'tributo', 'El destinatario solo va en los tributos'),
    exige((i) => i.edificioId === undefined || i.sentido === 'ingreso', 'El edificio alquilado solo va en los ingresos'),
  )
export type ImpuestoRenta = z.infer<typeof EsquemaImpuestoRenta>

/** Regla común de un grupo de locales comerciales (§7, §8). Todos los locales del tipo la usan. */
export const EsquemaTipoLocal = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  nombre: EsquemaNombreCorto,
  pct: EsquemaPorcentaje,
  minimo: EsquemaImporteMagnitud,
  diaCobro: z.int().min(1).max(31),
})
export type TipoLocal = z.infer<typeof EsquemaTipoLocal>

/**
 * Un tramo de estado de un local, desde una fecha (decisión 13, que sustituye `estado` y `estadoDesde`).
 * El primer tramo nace con el alta; cada cambio cuenta desde el día siguiente a la fecha actual (§7).
 */
export const EsquemaCambioEstadoLocal = z.object({
  desde: EsquemaFecha,
  estado: z.enum(['abierto', 'cerrado']),
})
export type CambioEstadoLocal = z.infer<typeof EsquemaCambioEstadoLocal>

/** Producción anotada de un mes concreto de un local (§7, A3c). Vacío = la habitual; 0 = no produjo y paga el mínimo. */
export const EsquemaProduccionMesLocal = z.object({
  mes: EsquemaAnioMes,
  importe: EsquemaImporteMagnitud,
  nota: EsquemaNotas.optional(),
})
export type ProduccionMesLocal = z.infer<typeof EsquemaProduccionMesLocal>

/** Un local comercial del asentamiento (§7, §8). */
export const EsquemaLocalComercial = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    nombre: EsquemaNombreLibre,
    tipoId: EsquemaId,
    titularId: EsquemaId.optional(),
    produccionHabitual: EsquemaImporteMagnitud,
    cambiosEstado: z.array(EsquemaCambioEstadoLocal).min(1),
    alta: EsquemaFecha,
    cobradoHasta: EsquemaAnioMes,
    notas: EsquemaNotas.optional(),
    producciones: z.array(EsquemaProduccionMesLocal),
  })
  .check(
    exige(
      (l) => l.cambiosEstado.every((c, i) => i === 0 || compararFechas(l.cambiosEstado[i - 1].desde, c.desde) < 0),
      'Los cambios de estado del local van en orden y sin repetir fecha',
    ),
    exige(
      (l) => l.cambiosEstado.every((c, i) => i === 0 || l.cambiosEstado[i - 1].estado !== c.estado),
      'Dos tramos seguidos de un local no pueden tener el mismo estado',
    ),
  )
export type LocalComercial = z.infer<typeof EsquemaLocalComercial>

// ---- Guarnición, defensas, animales y armería (A6, A6b, A12) --------------

/** Una unidad de la guarnición (§8). El tipo es genérico y el nombre propio va aquí. La soldada es por soldado (A6). */
export const EsquemaUnidadGuarnicion = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  nombre: EsquemaNombreLibre,
  numero: z.int().min(1),
  soldada: EsquemaImporteMagnitud,
  recurrencia: EsquemaRecurrencia,
})
export type UnidadGuarnicion = z.infer<typeof EsquemaUnidadGuarnicion>

/** Una defensa del asentamiento (§8). Una defensa nueva nace «Buena» (§6.6). */
export const EsquemaDefensa = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  nombre: EsquemaNombreLibre,
  estado: z.enum(['buena', 'daniada', 'enRuinas']),
})
export type Defensa = z.infer<typeof EsquemaDefensa>

/** Una fila de animales (§8). Tipo y género son únicos por asentamiento. */
export const EsquemaAnimal = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  tipoId: EsquemaId,
  cantidad: z.int().min(1),
  genero: z.enum(['hembra', 'macho', 'mixto']),
  valorUnitario: EsquemaImporteMagnitud.optional(),
  notas: EsquemaNotas.optional(),
})
export type Animal = z.infer<typeof EsquemaAnimal>

/** Una fila de la armería (§8). El valor total se calcula y no se guarda. */
export const EsquemaObjetoArmeria = z.object({
  ...CAMPOS_REGISTRO,
  dominioId: EsquemaId,
  nombre: EsquemaNombreLibre,
  cantidad: z.int().min(1),
  valorUnitario: EsquemaImporteMagnitud,
})
export type ObjetoArmeria = z.infer<typeof EsquemaObjetoArmeria>
```

- [ ] **Paso 5: Implementar `comercio.ts`**

Crea `src/dominio/modelo/comercio.ts` con este contenido:

```ts
import * as z from 'zod'
import { compararFechas } from '../calendario/fecha'
import {
  CAMPOS_EDICION,
  CAMPOS_REGISTRO,
  EsquemaFecha,
  EsquemaId,
  EsquemaImporteMagnitud,
  EsquemaImportePositivo,
  EsquemaNombreLargo,
  exige,
} from './comunes'

/** Precio de un recurso en un mercado (§8). Un recurso no repite fila y el precio es mayor que 0 (§6.6). */
export const EsquemaPrecioMercado = z.object({
  recursoId: EsquemaId,
  importe: EsquemaImportePositivo,
})
export type PrecioMercado = z.infer<typeof EsquemaPrecioMercado>

/**
 * Un mercado de la partida (§8). `localDe` es el asentamiento del mercado local, que lleva su nombre, lo crea A0
 * sin precios y no se elimina. El nombre se guarda siempre, también en el local, y la coherencia con el nombre
 * del asentamiento se comprueba aparte (apartado 4): decisión propia 20.
 */
export const EsquemaMercado = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLargo,
  localDe: EsquemaId.optional(),
  precios: z.array(EsquemaPrecioMercado),
})
export type Mercado = z.infer<typeof EsquemaMercado>

/** Destino de una ruta, con discriminador (decisión 13). §8 solo tenía `destinoId`, sin decir de qué era. */
export const EsquemaDestinoRuta = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('mercado'), id: EsquemaId }),
  z.object({ tipo: z.literal('asentamiento'), id: EsquemaId }),
])
export type DestinoRuta = z.infer<typeof EsquemaDestinoRuta>

/**
 * Días de viaje entre un asentamiento y un mercado o entre dos asentamientos (§8). Solo de ida, de 1 a 365 (§6.6).
 * Sin id: la clave es el par (origenId, destino). Una ruta entre dos asentamientos vale en los dos sentidos.
 */
export const EsquemaRuta = z.object({
  ...CAMPOS_EDICION,
  origenId: EsquemaId,
  destino: EsquemaDestinoRuta,
  diasViaje: z.int().min(1).max(365),
})
export type Ruta = z.infer<typeof EsquemaRuta>

/** Lo que lleva una caravana (§8). Un solo recurso por caravana. */
export const EsquemaCargaCaravana = z.object({
  recursoId: EsquemaId,
  cantidad: z.number().gt(0),
})
export type CargaCaravana = z.infer<typeof EsquemaCargaCaravana>

/** Una caravana de compra, venta o traslado (§7, §8). En un traslado, `vuelta` es la llegada. */
export const EsquemaCaravana = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId,
    operacion: z.enum(['compra', 'venta', 'traslado']),
    mercadoId: EsquemaId.optional(),
    destinoId: EsquemaId.optional(),
    carga: EsquemaCargaCaravana,
    precioUnidad: EsquemaImportePositivo.optional(),
    importe: EsquemaImporteMagnitud.optional(),
    salida: EsquemaFecha,
    vuelta: EsquemaFecha,
    estado: z.enum(['programada', 'enRuta', 'terminada']),
    movimientoSalidaId: EsquemaId.optional(),
    movimientoVueltaId: EsquemaId.optional(),
  })
  .check(
    exige(
      (c) =>
        c.operacion === 'traslado' ||
        (c.mercadoId !== undefined && c.precioUnidad !== undefined && c.importe !== undefined),
      'Una compra o una venta guardan su mercado, su precio por unidad y su importe',
    ),
    exige(
      (c) =>
        c.operacion !== 'traslado' ||
        (c.destinoId !== undefined &&
          c.mercadoId === undefined &&
          c.precioUnidad === undefined &&
          c.importe === undefined &&
          c.movimientoSalidaId === undefined &&
          c.movimientoVueltaId === undefined),
      'Un traslado guarda su asentamiento de destino y no mueve dinero',
    ),
    exige(
      (c) => c.operacion === 'traslado' || c.destinoId === undefined,
      'Solo un traslado tiene asentamiento de destino',
    ),
    exige((c) => c.destinoId !== c.dominioId, 'Un traslado no puede ir al mismo asentamiento del que sale'),
    exige((c) => compararFechas(c.salida, c.vuelta) <= 0, 'La vuelta no puede ser anterior a la salida'),
  )
export type Caravana = z.infer<typeof EsquemaCaravana>
```

- [ ] **Paso 6: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/modelo/almacen.test.ts src/dominio/modelo/asentamiento.test.ts src/dominio/modelo/comercio.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  3 passed (3)
      Tests  21 passed (21)
   Start at  23:02:47
   Duration  831ms (import 65%, transform 27%, tests 5%, worker 3%)
```

- [ ] **Paso 7: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **321 pruebas en 19 archivos**. Son **24 pruebas nuevas**: las 21 de los tres archivos de esta tarea y **tres más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `almacen.ts`, `asentamiento.ts` y `comercio.ts`. Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with fsModuleCache: true»), que no es un fallo:

```text
 Test Files  19 passed (19)
      Tests  321 passed (321)
```

- [ ] **Paso 8: Commit**

```bash
git add src/dominio/modelo/almacen.ts src/dominio/modelo/almacen.test.ts src/dominio/modelo/asentamiento.ts src/dominio/modelo/asentamiento.test.ts src/dominio/modelo/comercio.ts src/dominio/modelo/comercio.test.ts
git commit -m "feat(modelo): esquemas de almacén, asentamiento y comercio" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/modelo/almacen.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/almacen.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/asentamiento.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/asentamiento.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/comercio.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/comercio.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 3c4d5e6] feat(modelo): esquemas de almacén, asentamiento y comercio
 6 files changed, 1058 insertions(+)
 create mode 100644 src/dominio/modelo/almacen.test.ts
 create mode 100644 src/dominio/modelo/almacen.ts
 create mode 100644 src/dominio/modelo/asentamiento.test.ts
 create mode 100644 src/dominio/modelo/asentamiento.ts
 create mode 100644 src/dominio/modelo/comercio.test.ts
 create mode 100644 src/dominio/modelo/comercio.ts
```

---

### Tarea 6 · Esquemas: catálogos, eventos, avance, documento y resumen

Esta tarea cierra el modelo. `catalogos.ts` define las opciones y los recursos del catálogo de la app en **dos familias**: lo que vive en esta tablet (con `borrada` y `protegida`) y lo que viaja en una copia (sin esos dos campos), más las ubicaciones y las personas de cada partida y las dos tablas de nombres que usan los mensajes. `eventos.ts` define los eventos narrativos con sus efectos en tanto por ciento. `avance.ts` define el avance ya aplicado **sin** su copia del estado, para que no haya un ciclo de imports. `documento.ts` junta las 34 claves del estado completo, le añade el `snapshotPrevio` al avance y arma el documento que guarda Dexie. `resumen.ts` arma la fila que pinta P0 sin abrir el documento entero.

`resumen.ts` **no lleva esquema Zod**: `ResumenPartida` no viaja en la copia y la tabla `resumenes` la escribe la propia app, así que es un `interface` a secas (decisión propia 35 del contrato del modelo). Lo mismo pasa con `CatalogoApp` y `CambiosCatalogo`.

**Reglas de la especificación que implementa:**

- **Ámbito de las listas (§6.5, decisión 17).** Las categorías, los oficios y los tipos de edificio, de unidad, de defensa y de animal son **de la app**; `OpcionCatalogo` gana el campo `lista` (`categorias` | `oficios` | `tiposEdificio` | `tiposUnidad` | `tiposDefensa` | `tiposAnimal`), en plural y con índice en Dexie. Las ubicaciones y las personas son de cada partida: `Ubicación { id, partidaId, nombre }` y `PersonaEntidad { id, partidaId, nombre }` (§8), sin `partidaId` porque el documento ya es una partida (decisión 6).
- **Qué de un catálogo viaja en la copia (§6.1, decisión 7).** La copia lleva «{ id, nombre, grupo, plural o unidades, propia }»: **no** lleva `borrada` ni `protegida`/`protegido`, porque al importar manda el estado de esta tablet y una opción borrada se reactiva. Por eso hay `EsquemaOpcionEnCopia`/`EsquemaRecursoEnCopia` y `EsquemaOpcionCatalogo`/`EsquemaRecursoCatalogo`, escritos a partir de los mismos campos.
- **Plural y protección (§8, §6.6).** «`OpciónCatálogo { id, nombre, grupo?, plural?, propia, borrada, protegida? }`  // categorías, oficios (con plural), tipos de edificio, de unidad, de defensa y de animal; las de la app tienen id fijo («cat.alojamiento»); protegida: se renombra, pero no se elimina (candado en P7)». El plural **solo** se guarda en los oficios; en los demás tipos se propone con la regla de §6.6 y no se guarda (decisión propia 21). En los recursos, «`protegido?: víveres|reserva`».
- **Eventos narrativos (§8).** `EventoNarrativo { id, partidaId, dominioId?, nombre, inicio, duraciónDías, efectos: [{ ámbito: producción|consumo|costes|ingresos, objetivo: { tipo: todos|edificio|recurso|categoríaCoste|impuesto, id? }, pct }], notas }   // sin dominioId = evento de partida, sin efectos`. La unión por ámbito fija qué objetivos admite cada uno; «costes» no apunta a ningún registro, sino a una de las cuatro categorías de coste del selector n.º 29 (`salarios`, `soldadas`, `tributos`, `gastos`). Los locales comerciales no son objetivo (§7).
- **Avances con historial y un solo snapshot (decisión 4).** El documento guarda el historial de `Avance { id, desde, hasta, aplicadoEl, cambios[], avisos[] }` y `snapshotPrevio` **solo en el último**. «El snapshot es el estado completo de la partida sin la lista de avances y sin los catálogos de la app». `cambios[]` y `avisos[]` guardan lo que pinta P5 y la tabla de avisos de §9 (doce tipos).
- **Forma del documento (decisión 6).** «Documento guardado: `{ partida, ...colecciones..., avances }`, con la partida en la raíz y clave primaria de Dexie `partida.id`. Sin `partidaId` dentro del documento (cada documento ya es una partida) y sin duplicar el id». Son **34 claves**: `partida` y 33 colecciones, incluida `produccionesRealizadas` (decisión 1).
- **Campos desconocidos: se descartan (decisión 14).** «Los campos desconocidos se descartan». Lo hace `z.object` por defecto, y por eso el documento admite un JSON con ruido y devuelve el documento limpio.
- **La fila de P0 (§6.1, decisión 9).** P0 enseña de cada partida su nombre, su fecha, sus dominios y sus fechas de sesión. `abiertaEl` cambia al abrir, no viaja en la copia y no cuenta como cambio; `actualizada` es el último cambio del estado, y la «última copia exportada» (`exportadaEl`) se guarda junto al resumen, fuera del estado. `hayAvances` viene de `partida.ts` (tarea 3): si es `false`, P1 deja editar la fecha inicial y la Edad (§4).
- **Orden de `dominios` en el resumen.** El personaje primero y después los asentamientos, por su `alta` y, si empatan, por su `id` comparado con `<` (no con `localeCompare`, que depende de la configuración regional). Es la decisión propia 13 del cuadre.
- **Ni `EsquemaEstadoPartida` ni `EsquemaDocumentoPartida` llevan `.check()`**, ni tampoco `EsquemaAvanceRegistrado`: todo lo que cruza colecciones va en `validacion/` (tarea 13), y así `.extend()` sigue funcionando.
- **El dominio es puro (plan de la fase 1).** Los cinco archivos solo importan Zod, los otros archivos de `modelo/` y, en `resumen.ts`, `compararFechas` y los tipos `Fecha` y `Edad` de la fase 1. La prueba de pureza de la tarea 1 recorre también estos cinco módulos nuevos.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/modelo/catalogos.ts`, `src/dominio/modelo/eventos.ts`, `src/dominio/modelo/avance.ts`, `src/dominio/modelo/documento.ts`, `src/dominio/modelo/resumen.ts`
- Prueba: `src/dominio/modelo/catalogos.test.ts`, `src/dominio/modelo/eventos.test.ts`, `src/dominio/modelo/avance.test.ts`, `src/dominio/modelo/documento.test.ts`, `src/dominio/modelo/resumen.test.ts`

**Cómo se comportan los `.check()` de Zod 4.6.5** (comprobado): un `exige(...)` que falla **aborta los `.check()` siguientes** del mismo esquema, porque la incidencia se apila sin `continue: true`. Por eso cada `safeParse` de las pruebas espera **un solo mensaje**.

- [ ] **Paso 1: Escribir las cinco pruebas que fallan**

Crea `src/dominio/modelo/catalogos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  ARTICULO_LISTA,
  EsquemaCatalogosEnCopia,
  EsquemaListaCatalogo,
  EsquemaOpcionCatalogo,
  EsquemaOpcionEnCopia,
  EsquemaPersonaEntidad,
  EsquemaRecursoCatalogo,
  EsquemaRecursoEnCopia,
  EsquemaUbicacion,
  NOMBRE_LISTA,
  type CatalogoApp,
  type CatalogosEnCopia,
  type OpcionCatalogo,
  type RecursoCatalogo,
} from './catalogos'

/** La categoría «Alojamiento», de la app, tal como vive en esta tablet. */
const ALOJAMIENTO: OpcionCatalogo = {
  id: 'cat.alojamiento',
  nombre: 'Alojamiento',
  propia: false,
  borrada: false,
  lista: 'categorias',
  grupo: 'gastosPersonaje',
}

/** El recurso «Víveres», protegido: ni se renombra ni se elimina (§6.6). */
const VIVERES: RecursoCatalogo = {
  id: 'recurso.viveres',
  nombre: 'Víveres',
  unidadSingular: 'saco',
  unidadPlural: 'sacos',
  propia: false,
  borrada: false,
  protegido: 'viveres',
}

describe('EsquemaOpcionCatalogo', () => {
  it('exige la lista en plural y el grupo de esa lista (decisión 17)', () => {
    expect(EsquemaListaCatalogo.options).toEqual([
      'categorias',
      'oficios',
      'tiposEdificio',
      'tiposUnidad',
      'tiposDefensa',
      'tiposAnimal',
    ])
    expect(EsquemaOpcionCatalogo.parse(ALOJAMIENTO)).toEqual(ALOJAMIENTO)
    expect(EsquemaOpcionCatalogo.safeParse({ ...ALOJAMIENTO, lista: 'categoria' }).success).toBe(false)
    expect(EsquemaOpcionCatalogo.safeParse({ ...ALOJAMIENTO, grupo: 'tropa' }).success).toBe(false)
    expect(EsquemaOpcionCatalogo.safeParse({ ...ALOJAMIENTO, grupo: undefined }).success).toBe(false)

    const granjero: OpcionCatalogo = {
      id: 'oficio.granjero',
      nombre: 'Granjero',
      propia: false,
      borrada: false,
      lista: 'oficios',
      grupo: 'campo',
      plural: 'Granjeros',
    }
    expect(EsquemaOpcionCatalogo.parse(granjero)).toEqual(granjero)
    expect(EsquemaOpcionCatalogo.safeParse({ ...granjero, plural: undefined }).success).toBe(false)

    const torre: OpcionCatalogo = {
      id: 'defensa.torre-de-vigia',
      nombre: 'Torre de vigía',
      propia: false,
      borrada: false,
      lista: 'tiposDefensa',
    }
    expect(EsquemaOpcionCatalogo.parse(torre)).toEqual(torre)
  })

  it('deja fuera de la copia «borrada» y «protegida» (§6.1)', () => {
    const enCopia = EsquemaOpcionEnCopia.parse({ ...ALOJAMIENTO, protegida: true })
    expect(enCopia).toEqual({
      id: 'cat.alojamiento',
      nombre: 'Alojamiento',
      propia: false,
      lista: 'categorias',
      grupo: 'gastosPersonaje',
    })
    expect('borrada' in enCopia).toBe(false)
    expect('protegida' in enCopia).toBe(false)

    const recursoEnCopia = EsquemaRecursoEnCopia.parse(VIVERES)
    expect(recursoEnCopia).toEqual({
      id: 'recurso.viveres',
      nombre: 'Víveres',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: false,
    })
    expect('protegido' in recursoEnCopia).toBe(false)
  })

  it('un CatalogoApp vale como CatalogosEnCopia, que es lo que validan las tres validaciones', () => {
    expect(EsquemaRecursoCatalogo.parse(VIVERES)).toEqual(VIVERES)
    expect(EsquemaRecursoCatalogo.safeParse({ ...VIVERES, protegido: 'reserva' }).success).toBe(true)
    expect(EsquemaRecursoCatalogo.safeParse({ ...VIVERES, protegido: 'ninguno' }).success).toBe(false)
    expect(EsquemaRecursoCatalogo.safeParse({ ...VIVERES, unidadSingular: '' }).success).toBe(false)

    const enLaTablet: CatalogoApp = { opciones: [ALOJAMIENTO], recursos: [VIVERES] }
    const comoCopia: CatalogosEnCopia = enLaTablet
    expect(EsquemaCatalogosEnCopia.parse(comoCopia)).toEqual({
      opciones: [{ id: 'cat.alojamiento', nombre: 'Alojamiento', propia: false, lista: 'categorias', grupo: 'gastosPersonaje' }],
      recursos: [
        { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false },
      ],
    })
  })
})

describe('listas, ubicaciones y personas de la partida', () => {
  it('nombra las seis listas con su artículo y guarda ubicaciones y personas', () => {
    expect(NOMBRE_LISTA).toEqual({
      categorias: 'categoría',
      oficios: 'oficio',
      tiposEdificio: 'tipo de edificio',
      tiposUnidad: 'tipo de unidad',
      tiposDefensa: 'tipo de defensa',
      tiposAnimal: 'tipo de animal',
    })
    expect(ARTICULO_LISTA).toEqual({
      categorias: 'La',
      oficios: 'El',
      tiposEdificio: 'El',
      tiposUnidad: 'El',
      tiposDefensa: 'El',
      tiposAnimal: 'El',
    })

    const posada = { id: 'ubi.posada', nombre: 'Posada El Poney Pisador' }
    expect(EsquemaUbicacion.parse(posada)).toEqual(posada)
    const gremio = { id: 'persona.gremio-bree', nombre: 'Gremio de mercaderes de Bree' }
    expect(EsquemaPersonaEntidad.parse(gremio)).toEqual(gremio)
    expect(EsquemaUbicacion.safeParse({ id: 'ubi.x', nombre: 'A' }).success).toBe(false)
  })
})
```

Crea `src/dominio/modelo/eventos.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { EsquemaEfectoEvento, EsquemaEventoNarrativo, type EventoNarrativo } from './eventos'

/** «Lluvias de primavera»: del 8 al 21 de abril, con las Granjas del Oeste al −20 % (A11). */
const LLUVIAS: EventoNarrativo = {
  id: 'evt.lluvias-de-primavera',
  dominioId: 'dom.bree',
  nombre: 'Lluvias de primavera',
  inicio: { anio: 1640, mes: 4, dia: 8 },
  duracionDias: 14,
  efectos: [
    { ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'ed.granjas-del-oeste' }, pct: -20 },
  ],
  notas: 'El máster anuncia lluvias intensas: los campos del oeste se encharcan.',
}

describe('EsquemaEventoNarrativo', () => {
  it('acepta las lluvias de primavera con su efecto de producción del −20 %', () => {
    expect(EsquemaEventoNarrativo.parse(LLUVIAS)).toEqual(LLUVIAS)
    expect(EsquemaEventoNarrativo.safeParse({ ...LLUVIAS, duracionDias: 0 }).success).toBe(false)

    const dePartida = { ...LLUVIAS, id: 'evt.feria', dominioId: undefined, nombre: 'Feria de primavera', efectos: [] }
    expect(EsquemaEventoNarrativo.parse(dePartida)).toEqual(dePartida)

    const dePartidaConEfectos = EsquemaEventoNarrativo.safeParse({ ...LLUVIAS, dominioId: undefined })
    expect(dePartidaConEfectos.success).toBe(false)
    expect(dePartidaConEfectos.error?.issues.map((i) => i.message)).toEqual([
      'Un evento de partida no tiene efectos económicos',
    ])
  })

  it('fija por ámbito qué objetivos admite cada efecto (selectores n.º 28 y 29)', () => {
    const efectos = [
      { ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: -20 },
      { ambito: 'produccion', objetivo: { tipo: 'edificio', id: 'ed.cantera' }, pct: 15.5 },
      { ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.viveres' }, pct: 10 },
      { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: -100 },
      { ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: 'imp.peaje' }, pct: -100 },
    ]
    for (const efecto of efectos) {
      expect(EsquemaEfectoEvento.parse(efecto)).toEqual(efecto)
    }

    expect(
      EsquemaEfectoEvento.safeParse({ ambito: 'produccion', objetivo: { tipo: 'recurso', id: 'recurso.viveres' }, pct: 5 })
        .success,
    ).toBe(false)
    expect(
      EsquemaEfectoEvento.safeParse({ ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'obras' }, pct: 5 })
        .success,
    ).toBe(false)
    expect(
      EsquemaEfectoEvento.safeParse({ ambito: 'produccion', objetivo: { tipo: 'todos' }, pct: -100.5 }).success,
    ).toBe(false)
    const tresDecimales = EsquemaEfectoEvento.safeParse({
      ambito: 'produccion',
      objetivo: { tipo: 'todos' },
      pct: 12.125,
    })
    expect(tresDecimales.success).toBe(false)
    expect(tresDecimales.error?.issues.map((i) => i.message)).toEqual(['Usa como mucho 2 decimales'])
  })
})
```

Crea `src/dominio/modelo/avance.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaAvanceRegistrado,
  EsquemaAvisoAvance,
  EsquemaCambioAvance,
  EsquemaTipoAviso,
  type AvanceRegistrado,
} from './avance'

/** El último avance del ejemplo: del 10 al 12 de abril de 1640 (P5). */
const DEL_10_AL_12: AvanceRegistrado = {
  id: 'av.10-12abr',
  desde: { anio: 1640, mes: 4, dia: 10 },
  hasta: { anio: 1640, mes: 4, dia: 12 },
  aplicadoEl: '2026-09-17T18:30:00.000Z',
  cambios: [
    { tipo: 'saldo', dominioId: 'dom.bree', antes: 34000000, despues: 34060000, movimientos: 1 },
    { tipo: 'almacen', dominioId: 'dom.bree', recursoId: 'recurso.viveres', antes: 920, despues: 890 },
    { tipo: 'hecho', dominioId: 'dom.bree', texto: 'Feria de primavera celebrada · 15 al 17' },
  ],
  avisos: [{ tipo: 'faltaPrevista', color: 'ambar', dominioId: 'dom.bree', texto: 'Víveres para 11 días' }],
}

describe('EsquemaAvanceRegistrado', () => {
  it('acepta el avance del 10 al 12 de abril con sus cambios y sus avisos', () => {
    expect(EsquemaAvanceRegistrado.parse(DEL_10_AL_12)).toEqual(DEL_10_AL_12)
    expect(EsquemaAvanceRegistrado.parse({ ...DEL_10_AL_12, snapshotPrevio: { partida: {} } })).toEqual(DEL_10_AL_12)
    expect(EsquemaAvanceRegistrado.safeParse({ ...DEL_10_AL_12, aplicadoEl: '17/09/2026' }).success).toBe(false)
  })

  it('tipa los tres cambios de P5 y los doce avisos de la tabla de §9', () => {
    expect(EsquemaTipoAviso.options).toEqual([
      'faltaDeRecurso',
      'faltaPrevista',
      'impago',
      'deudaVencida',
      'deudaQueVence',
      'pagoNoCubierto',
      'saldoNegativo',
      'obraQueNoPudoEmpezar',
      'caravanaQueNoPudoSalir',
      'edificioTerminadoSinProduccion',
      'mejoraTerminada',
      'recursoPerdido',
    ])
    for (const cambio of DEL_10_AL_12.cambios) {
      expect(EsquemaCambioAvance.parse(cambio)).toEqual(cambio)
    }
    expect(EsquemaCambioAvance.safeParse({ tipo: 'poblacion', dominioId: 'dom.bree', antes: 1, despues: 2 }).success).toBe(
      false,
    )
    expect(EsquemaCambioAvance.safeParse({ tipo: 'hecho', texto: 'Sin dominio' }).success).toBe(true)
    expect(EsquemaCambioAvance.safeParse({ tipo: 'hecho', texto: '' }).success).toBe(false)

    const rojo = { tipo: 'saldoNegativo' as const, color: 'rojo' as const, texto: 'La caja de Archet se ha quedado a 0' }
    expect(EsquemaAvisoAvance.parse(rojo)).toEqual(rojo)
    expect(EsquemaAvisoAvance.safeParse({ ...rojo, color: 'verde' }).success).toBe(false)
  })
})
```

Crea `src/dominio/modelo/documento.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaAvance,
  EsquemaDocumentoPartida,
  EsquemaEstadoPartida,
  type DocumentoPartida,
  type EstadoPartida,
} from './documento'
import { VERSION_FORMATO, type Partida } from './partida'

/** La cabecera de «La Sombra del Este» el 12 de abril de 1640 T.E. */
const PARTIDA: Partida = {
  id: 'p.sombra-del-este',
  nombre: 'La Sombra del Este',
  edad: 'tercera',
  equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
  kgPorSaco: 30,
  diasPorSaco: 30,
  fechaInicial: { anio: 1640, mes: 1, dia: 1 },
  fechaActual: { anio: 1640, mes: 4, dia: 12 },
  creada: '2026-09-15T10:00:00.000Z',
  actualizada: '2026-09-17T18:30:00.000Z',
  versionFormato: VERSION_FORMATO,
  cambiosDesdeUltimoAvance: 0,
}

/** El estado con la cabecera y las 33 colecciones vacías: el esqueleto que usa esta prueba. */
const ESTADO_VACIO: EstadoPartida = {
  partida: PARTIDA,
  dominios: [{ id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }],
  cajas: [{ dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } }],
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

/** Los dos avances del ejemplo reducidos a lo imprescindible; solo el último lleva snapshotPrevio (decisión 4). */
const DOCUMENTO: DocumentoPartida = {
  ...ESTADO_VACIO,
  avances: [
    {
      id: 'av.6-10abr',
      desde: { anio: 1640, mes: 4, dia: 6 },
      hasta: { anio: 1640, mes: 4, dia: 10 },
      aplicadoEl: '2026-09-16T09:00:00.000Z',
      cambios: [],
      avisos: [],
    },
    {
      id: 'av.10-12abr',
      desde: { anio: 1640, mes: 4, dia: 10 },
      hasta: { anio: 1640, mes: 4, dia: 12 },
      aplicadoEl: '2026-09-17T18:30:00.000Z',
      cambios: [],
      avisos: [],
      snapshotPrevio: ESTADO_VACIO,
    },
  ],
}

describe('EsquemaEstadoPartida', () => {
  it('tiene 34 claves: la partida y sus 33 colecciones, con produccionesRealizadas (decisión 1)', () => {
    const estado = EsquemaEstadoPartida.parse(ESTADO_VACIO)
    const claves = Object.keys(estado)
    expect(claves.length).toBe(34)
    expect(claves[0]).toBe('partida')
    expect(claves).toContain('produccionesRealizadas')
    expect(claves).not.toContain('avances')
    expect(claves).not.toContain('opciones')
    expect(claves).not.toContain('recursos')
  })

  it('no tiene id de primer nivel ni partidaId dentro, y descarta lo desconocido (decisión 6)', () => {
    const conRuido = EsquemaDocumentoPartida.parse({
      ...DOCUMENTO,
      id: 'p.sombra-del-este',
      partidaId: 'p.sombra-del-este',
      colorFavorito: 'azul',
    })
    expect(conRuido).toEqual(DOCUMENTO)
    expect('id' in conRuido).toBe(false)
    expect('partidaId' in conRuido).toBe(false)
    expect(Object.keys(conRuido).length).toBe(35)
  })
})

describe('EsquemaAvance y EsquemaDocumentoPartida', () => {
  it('lleva el snapshot solo donde lo hay, y el snapshot no guarda avances ni catálogos (decisión 4)', () => {
    expect(EsquemaDocumentoPartida.parse(DOCUMENTO)).toEqual(DOCUMENTO)

    const sinSnapshot = EsquemaAvance.parse(DOCUMENTO.avances[0])
    expect(sinSnapshot.snapshotPrevio).toBeUndefined()

    const conSnapshot = EsquemaAvance.parse(DOCUMENTO.avances[1])
    expect(Object.keys(conSnapshot.snapshotPrevio ?? {}).length).toBe(34)
    expect(conSnapshot.snapshotPrevio).not.toHaveProperty('avances')
    expect(conSnapshot.snapshotPrevio).not.toHaveProperty('catalogos')

    const snapshotConAvances = EsquemaAvance.parse({
      ...DOCUMENTO.avances[1],
      snapshotPrevio: { ...ESTADO_VACIO, avances: [] },
    })
    expect(snapshotConAvances.snapshotPrevio).not.toHaveProperty('avances')

    expect(EsquemaDocumentoPartida.safeParse({ ...DOCUMENTO, avances: undefined }).success).toBe(false)
    expect(EsquemaDocumentoPartida.safeParse({ ...DOCUMENTO, produccionesRealizadas: undefined }).success).toBe(false)
  })
})
```

Crea `src/dominio/modelo/resumen.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { DocumentoPartida } from './documento'
import { VERSION_FORMATO } from './partida'
import { resumenDePartida } from './resumen'

/** Un documento con el personaje y dos asentamientos, para comprobar el orden de `dominios`. */
const DOCUMENTO: DocumentoPartida = {
  partida: {
    id: 'p.sombra-del-este',
    nombre: 'La Sombra del Este',
    edad: 'tercera',
    equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
    kgPorSaco: 30,
    diasPorSaco: 30,
    fechaInicial: { anio: 1640, mes: 1, dia: 1 },
    fechaActual: { anio: 1640, mes: 4, dia: 12 },
    creada: '2026-09-15T10:00:00.000Z',
    actualizada: '2026-09-17T18:30:00.000Z',
    versionFormato: VERSION_FORMATO,
    cambiosDesdeUltimoAvance: 3,
  },
  dominios: [
    { id: 'dom.zarcero', tipo: 'asentamiento', nombre: 'Zarcero', categoria: 'aldea', alta: { anio: 1640, mes: 1, dia: 1 } },
    { id: 'dom.bree', tipo: 'asentamiento', nombre: 'Bree', categoria: 'pueblo', alta: { anio: 1640, mes: 1, dia: 1 } },
    { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
    { id: 'dom.archet', tipo: 'asentamiento', nombre: 'Archet', categoria: 'aldea', alta: { anio: 1640, mes: 2, dia: 20 } },
  ],
  cajas: [],
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
  avances: [],
}

describe('resumenDePartida', () => {
  it('pone el personaje primero y los asentamientos por su alta y, si empatan, por su id', () => {
    const resumen = resumenDePartida(DOCUMENTO, { abiertaEl: '2026-09-17T19:00:00.000Z' })
    expect(resumen.dominios).toEqual(['Tharan', 'Bree', 'Zarcero', 'Archet'])
    expect(resumen.id).toBe('p.sombra-del-este')
    expect(resumen.nombre).toBe('La Sombra del Este')
    expect(resumen.edad).toBe('tercera')
    expect(resumen.fechaInicial).toEqual({ anio: 1640, mes: 1, dia: 1 })
    expect(resumen.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(resumen.creada).toBe('2026-09-15T10:00:00.000Z')
    expect(resumen.actualizada).toBe('2026-09-17T18:30:00.000Z')
  })

  it('copia abiertaEl y exportadaEl de la sesión y calcula hayAvances (decisión 9)', () => {
    const conCopia = resumenDePartida(DOCUMENTO, {
      abiertaEl: '2026-09-17T19:00:00.000Z',
      exportadaEl: '2026-09-17T18:45:00.000Z',
    })
    expect(conCopia.abiertaEl).toBe('2026-09-17T19:00:00.000Z')
    expect(conCopia.exportadaEl).toBe('2026-09-17T18:45:00.000Z')
    expect(conCopia.hayAvances).toBe(true)

    const reciencreada = resumenDePartida(
      { ...DOCUMENTO, partida: { ...DOCUMENTO.partida, fechaActual: { anio: 1640, mes: 1, dia: 1 } } },
      { abiertaEl: '2026-09-17T19:00:00.000Z' },
    )
    expect(reciencreada.exportadaEl).toBeUndefined()
    expect(reciencreada.hayAvances).toBe(false)
  })
})
```

- [ ] **Paso 2: Ejecutar las pruebas y ver que fallan**

```bash
npx vitest run src/dominio/modelo/catalogos.test.ts src/dominio/modelo/eventos.test.ts src/dominio/modelo/avance.test.ts src/dominio/modelo/documento.test.ts src/dominio/modelo/resumen.test.ts
```

Fallo esperado: los cinco módulos todavía no existen. La hora, la duración, el orden de los archivos y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/modelo/eventos.test.ts (0 test)
 ❯ src/dominio/modelo/documento.test.ts (0 test)
 ❯ src/dominio/modelo/avance.test.ts (0 test)
 ❯ src/dominio/modelo/catalogos.test.ts (0 test)
 ❯ src/dominio/modelo/resumen.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/modelo/avance.test.ts [ src/dominio/modelo/avance.test.ts ]
Error: Cannot find module './avance' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/avance.test.ts
 ❯ src/dominio/modelo/avance.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaAvanceRegistrado,
      4|   EsquemaAvisoAvance,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  src/dominio/modelo/catalogos.test.ts [ src/dominio/modelo/catalogos.test.ts ]
Error: Cannot find module './catalogos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/catalogos.test.ts
 ❯ src/dominio/modelo/catalogos.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   ARTICULO_LISTA,
      4|   EsquemaCatalogosEnCopia,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  src/dominio/modelo/documento.test.ts [ src/dominio/modelo/documento.test.ts ]
Error: Cannot find module './documento' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/documento.test.ts
 ❯ src/dominio/modelo/documento.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import {
       | ^
      3|   EsquemaAvance,
      4|   EsquemaDocumentoPartida,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  src/dominio/modelo/eventos.test.ts [ src/dominio/modelo/eventos.test.ts ]
Error: Cannot find module './eventos' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/eventos.test.ts
 ❯ src/dominio/modelo/eventos.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import { EsquemaEfectoEvento, EsquemaEventoNarrativo, type EventoNarra…
       | ^
      3|
      4| /** «Lluvias de primavera»: del 8 al 21 de abril, con las Granjas del …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  src/dominio/modelo/resumen.test.ts [ src/dominio/modelo/resumen.test.ts ]
Error: Cannot find module './resumen' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/modelo/resumen.test.ts
 ❯ src/dominio/modelo/resumen.test.ts:4:1
      2| import type { DocumentoPartida } from './documento'
      3| import { VERSION_FORMATO } from './partida'
      4| import { resumenDePartida } from './resumen'
       | ^
      5|
      6| /** Un documento con el personaje y dos asentamientos, para comprobar …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  5 failed (5)
      Tests  no tests
   Start at  23:01:34
   Duration  1.09s (worker 98%, environment 2%)
```

- [ ] **Paso 3: Implementar `catalogos.ts`**

Crea `src/dominio/modelo/catalogos.ts` con este contenido:

```ts
import * as z from 'zod'
import { CAMPOS_REGISTRO, EsquemaId, EsquemaNombreCorto, EsquemaNombreLargo, type Id } from './comunes'

/** Las seis listas de opciones de la app (decisión 17). Es el índice `lista` de la tabla `opcionesCatalogo` de Dexie. */
export const EsquemaListaCatalogo = z.enum([
  'categorias',
  'oficios',
  'tiposEdificio',
  'tiposUnidad',
  'tiposDefensa',
  'tiposAnimal',
])
export type ListaCatalogo = z.infer<typeof EsquemaListaCatalogo>

/**
 * Campos que una opción lleva **también en la copia**: los que nombra §6.1 («{ id, nombre, grupo, plural o
 * unidades, propia }»). Las de la app llevan id fijo («cat.alojamiento»).
 */
const CAMPOS_OPCION_EN_COPIA = {
  id: EsquemaId,
  nombre: EsquemaNombreCorto,
  propia: z.boolean(),
}

/**
 * Campos que solo existen en esta tablet y **no viajan en la copia** (§6.1): al importar mandan los de aquí,
 * y una opción borrada se reactiva (decisión 7).
 */
const CAMPOS_OPCION_EN_LA_TABLET = {
  borrada: z.boolean(),
  protegida: z.boolean().optional(),
}

/**
 * El grupo de cada lista, como clave y no como rótulo: los rótulos que se pintan salen de la interfaz
 * (decisión propia 31). Los tipos de defensa no tienen grupos (selector n.º 24).
 */
const GRUPO_CATEGORIAS = z.enum(['gastosPersonaje', 'ingresosPersonaje', 'asentamientos', 'otros', 'tuyas'])
const GRUPO_OFICIOS = z.enum(['campo', 'materiasPrimas', 'oficios', 'servicios'])
const GRUPO_TIPOS_EDIFICIO = z.enum(['alimentos', 'materiasPrimas', 'artesania', 'almacenaje', 'servicios'])
const GRUPO_TIPOS_UNIDAD = z.enum(['tropa', 'mandos'])
const GRUPO_TIPOS_ANIMAL = z.enum([
  'bovino',
  'caballar',
  'ovinoYCaprino',
  'porcino',
  'avesDeCorral',
  'perrosYGatos',
  'cetreria',
  'pequeniosAnimales',
  'cargaExotica',
  'estanques',
  'enCercado',
])

/**
 * Una opción tal como viaja en la copia (§6.1, decisión 6): sin `borrada` ni `protegida`.
 * El plural solo se guarda en los oficios (§8, «oficios (con plural)»): en los tipos se propone con la regla
 * de §6.6 y no se guarda (decisión propia 21).
 */
export const EsquemaOpcionEnCopia = z.discriminatedUnion('lista', [
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('categorias'), grupo: GRUPO_CATEGORIAS }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('oficios'), grupo: GRUPO_OFICIOS, plural: EsquemaNombreCorto }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposEdificio'), grupo: GRUPO_TIPOS_EDIFICIO }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposUnidad'), grupo: GRUPO_TIPOS_UNIDAD }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposDefensa') }),
  z.object({ ...CAMPOS_OPCION_EN_COPIA, lista: z.literal('tiposAnimal'), grupo: GRUPO_TIPOS_ANIMAL }),
])
export type OpcionEnCopia = z.infer<typeof EsquemaOpcionEnCopia>

/** Una opción de catálogo tal como vive en la tabla `opcionesCatalogo` de esta tablet (§6.5, decisión 17). */
export const EsquemaOpcionCatalogo = z.discriminatedUnion('lista', [
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('categorias'),
    grupo: GRUPO_CATEGORIAS,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('oficios'),
    grupo: GRUPO_OFICIOS,
    plural: EsquemaNombreCorto,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposEdificio'),
    grupo: GRUPO_TIPOS_EDIFICIO,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposUnidad'),
    grupo: GRUPO_TIPOS_UNIDAD,
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposDefensa'),
  }),
  z.object({
    ...CAMPOS_OPCION_EN_COPIA,
    ...CAMPOS_OPCION_EN_LA_TABLET,
    lista: z.literal('tiposAnimal'),
    grupo: GRUPO_TIPOS_ANIMAL,
  }),
])
export type OpcionCatalogo = z.infer<typeof EsquemaOpcionCatalogo>

/** Un recurso tal como viaja en la copia (§6.1): sin `borrada` ni `protegido`. */
export const EsquemaRecursoEnCopia = z.object({
  id: EsquemaId,
  nombre: EsquemaNombreCorto,
  unidadSingular: z.string().min(1).max(20),
  unidadPlural: z.string().min(1).max(20),
  propia: z.boolean(),
})
export type RecursoEnCopia = z.infer<typeof EsquemaRecursoEnCopia>

/**
 * Un recurso del catálogo de la app (§8). Todos los recursoId apuntan aquí.
 * `protegido`: «viveres» ni se renombra ni se elimina; «reserva» (Cerveza, Madera, Piedra y Arcilla) se renombra
 * pero no se elimina (§6.6, patrón 5).
 */
export const EsquemaRecursoCatalogo = EsquemaRecursoEnCopia.extend({
  borrada: z.boolean(),
  protegido: z.enum(['viveres', 'reserva']).optional(),
})
export type RecursoCatalogo = z.infer<typeof EsquemaRecursoCatalogo>

/** Los catálogos que acompañan a una copia (§6.1, decisión 6). La copia no lleva lo que es de esta tablet. */
export const EsquemaCatalogosEnCopia = z.object({
  opciones: z.array(EsquemaOpcionEnCopia),
  recursos: z.array(EsquemaRecursoEnCopia),
})
export type CatalogosEnCopia = z.infer<typeof EsquemaCatalogosEnCopia>

/** El catálogo de la app tal como está en esta tablet (opciones y recursos, borrados incluidos). */
export interface CatalogoApp {
  opciones: OpcionCatalogo[]
  recursos: RecursoCatalogo[]
}

/** Altas y reactivaciones que hay que escribir en el catálogo tras fusionar una copia (decisión 7). */
export interface CambiosCatalogo {
  opcionesNuevas: OpcionCatalogo[]
  recursosNuevos: RecursoCatalogo[]
  opcionesReactivadas: Id[]
  recursosReactivados: Id[]
}

/** Nombre en singular de cada lista, para los mensajes: «La categoría …», «El tipo de edificio …». */
export const NOMBRE_LISTA: Readonly<Record<ListaCatalogo, string>> = {
  categorias: 'categoría',
  oficios: 'oficio',
  tiposEdificio: 'tipo de edificio',
  tiposUnidad: 'tipo de unidad',
  tiposDefensa: 'tipo de defensa',
  tiposAnimal: 'tipo de animal',
}

/** Artículo de cada lista en los mensajes: «La» para categoría, «El» para las demás. */
export const ARTICULO_LISTA: Readonly<Record<ListaCatalogo, 'La' | 'El'>> = {
  categorias: 'La',
  oficios: 'El',
  tiposEdificio: 'El',
  tiposUnidad: 'El',
  tiposDefensa: 'El',
  tiposAnimal: 'El',
}

/** Una ubicación propia de la partida (§8). «Encima», «Caja de X» y «Almacén de X» salen de los dominios y no se guardan. */
export const EsquemaUbicacion = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLargo,
})
export type Ubicacion = z.infer<typeof EsquemaUbicacion>

/** Una persona o entidad de la partida (§8): contrapartes, compradores, destinatarios y titulares de locales. */
export const EsquemaPersonaEntidad = z.object({
  ...CAMPOS_REGISTRO,
  nombre: EsquemaNombreLargo,
})
export type PersonaEntidad = z.infer<typeof EsquemaPersonaEntidad>
```

- [ ] **Paso 4: Implementar `eventos.ts`**

Crea `src/dominio/modelo/eventos.ts` con este contenido:

```ts
import * as z from 'zod'
import { CAMPOS_REGISTRO, EsquemaFecha, EsquemaId, EsquemaNombreLibre, EsquemaNotas, decimalesComoMucho, exige } from './comunes'

/** Porcentaje de un efecto de evento (§7). Puede ser negativo, nunca por debajo de −100 (decisión propia 5). */
export const EsquemaPctEvento = z.number().min(-100).check(decimalesComoMucho(2))

/**
 * Efecto de un evento narrativo (§8, selectores n.º 28 y 29). La unión por ámbito fija qué objetivos admite cada
 * uno; «costes» no apunta a ningún registro, sino a una de las cuatro categorías de coste de n.º 29.
 * Los locales comerciales no son objetivo (§7).
 */
export const EsquemaEfectoEvento = z.discriminatedUnion('ambito', [
  z.object({
    ambito: z.literal('produccion'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('edificio'), id: EsquemaId }),
    ]),
    pct: EsquemaPctEvento,
  }),
  z.object({
    ambito: z.literal('consumo'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('recurso'), id: EsquemaId }),
    ]),
    pct: EsquemaPctEvento,
  }),
  z.object({
    ambito: z.literal('costes'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('categoriaCoste'), id: z.enum(['salarios', 'soldadas', 'tributos', 'gastos']) }),
    ]),
    pct: EsquemaPctEvento,
  }),
  z.object({
    ambito: z.literal('ingresos'),
    objetivo: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('todos') }),
      z.object({ tipo: z.literal('impuesto'), id: EsquemaId }),
    ]),
    pct: EsquemaPctEvento,
  }),
])
export type EfectoEvento = z.infer<typeof EsquemaEfectoEvento>

/** Un evento narrativo, de un asentamiento o de la partida (§8). Fin = inicio + duracionDias − 1. */
export const EsquemaEventoNarrativo = z
  .object({
    ...CAMPOS_REGISTRO,
    dominioId: EsquemaId.optional(),
    nombre: EsquemaNombreLibre,
    inicio: EsquemaFecha,
    duracionDias: z.int().min(1),
    efectos: z.array(EsquemaEfectoEvento),
    notas: EsquemaNotas.optional(),
  })
  .check(
    exige(
      (e) => e.dominioId !== undefined || e.efectos.length === 0,
      'Un evento de partida no tiene efectos económicos',
    ),
  )
export type EventoNarrativo = z.infer<typeof EsquemaEventoNarrativo>
```

- [ ] **Paso 5: Implementar `avance.ts`**

Crea `src/dominio/modelo/avance.ts` con este contenido:

```ts
import * as z from 'zod'
import { EsquemaCantidadRecurso, EsquemaFecha, EsquemaId, EsquemaInstante } from './comunes'

/**
 * Un cambio que el avance dejó y que P5 vuelve a pintar al reabrir el resumen desde P2 (decisión 4).
 * P5 enseña: los saldos antes y después por dominio con su número de movimientos, los almacenes antes y
 * después y los hechos destacados («Feria de primavera celebrada · 15 al 17»).
 */
export const EsquemaCambioAvance = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('saldo'),
    dominioId: EsquemaId,
    antes: z.int(),
    despues: z.int(),
    movimientos: z.int().min(0),
  }),
  z.object({
    tipo: z.literal('almacen'),
    dominioId: EsquemaId,
    recursoId: EsquemaId,
    antes: EsquemaCantidadRecurso,
    despues: EsquemaCantidadRecurso,
  }),
  z.object({
    tipo: z.literal('hecho'),
    dominioId: EsquemaId.optional(),
    texto: z.string().min(1).max(200),
  }),
])
export type CambioAvance = z.infer<typeof EsquemaCambioAvance>

/** Los doce tipos de aviso de la tabla de §9, en el mismo orden. */
export const EsquemaTipoAviso = z.enum([
  'faltaDeRecurso',
  'faltaPrevista',
  'impago',
  'deudaVencida',
  'deudaQueVence',
  'pagoNoCubierto',
  'saldoNegativo',
  'obraQueNoPudoEmpezar',
  'caravanaQueNoPudoSalir',
  'edificioTerminadoSinProduccion',
  'mejoraTerminada',
  'recursoPerdido',
])
export type TipoAviso = z.infer<typeof EsquemaTipoAviso>

/** Un aviso guardado con el avance, tal como lo pinta P5 (decisión 4). Sigue vigente hasta el avance siguiente. */
export const EsquemaAvisoAvance = z.object({
  tipo: EsquemaTipoAviso,
  color: z.enum(['rojo', 'ambar']),
  dominioId: EsquemaId.optional(),
  texto: z.string().min(1).max(200),
})
export type AvisoAvance = z.infer<typeof EsquemaAvisoAvance>

/** Un avance ya aplicado, sin su snapshot (§8, decisión 4). El snapshot lo añade documento.ts, solo en el último. */
export const EsquemaAvanceRegistrado = z.object({
  id: EsquemaId,
  desde: EsquemaFecha,
  hasta: EsquemaFecha,
  aplicadoEl: EsquemaInstante,
  cambios: z.array(EsquemaCambioAvance),
  avisos: z.array(EsquemaAvisoAvance),
})
export type AvanceRegistrado = z.infer<typeof EsquemaAvanceRegistrado>
```

- [ ] **Paso 6: Implementar `documento.ts`**

Crea `src/dominio/modelo/documento.ts` con este contenido:

```ts
import * as z from 'zod'
import {
  EsquemaAjusteExistencias,
  EsquemaEntradaAlmacen,
  EsquemaExistencia,
  EsquemaPoblacion,
  EsquemaProduccionRealizada,
} from './almacen'
import {
  EsquemaAnimal,
  EsquemaDefensa,
  EsquemaEdificio,
  EsquemaImpuestoRenta,
  EsquemaLocalComercial,
  EsquemaObjetoArmeria,
  EsquemaObra,
  EsquemaTipoLocal,
  EsquemaTrabajador,
  EsquemaUnidadGuarnicion,
} from './asentamiento'
import { EsquemaAvanceRegistrado } from './avance'
import { EsquemaPersonaEntidad, EsquemaUbicacion } from './catalogos'
import { EsquemaCaravana, EsquemaMercado, EsquemaRuta } from './comercio'
import { EsquemaCaja, EsquemaDominio } from './dominios'
import { EsquemaDeuda } from './deudas'
import { EsquemaEventoNarrativo } from './eventos'
import { EsquemaMovimiento, EsquemaRecurrenteDinero, EsquemaTransferencia } from './movimientos'
import { EsquemaPartida } from './partida'
import {
  EsquemaHechizo,
  EsquemaIntentoAprendizaje,
  EsquemaInversion,
  EsquemaObjetoInventario,
  EsquemaPergamino,
  EsquemaVenta,
} from './personaje'

/**
 * El estado completo de una partida: lo que recibe simular(estado, dias) (§9) y lo que copia snapshotPrevio
 * (§8, decisión 4). No lleva la lista de avances ni los catálogos de la app, que viven fuera de la partida (§6.5).
 * El orden de las claves de este objeto es el orden canónico de la exportación (decisión propia 28).
 */
export const EsquemaEstadoPartida = z.object({
  partida: EsquemaPartida,
  // Dinero (personaje y asentamientos)
  dominios: z.array(EsquemaDominio),
  cajas: z.array(EsquemaCaja),
  movimientos: z.array(EsquemaMovimiento),
  transferencias: z.array(EsquemaTransferencia),
  deudas: z.array(EsquemaDeuda),
  recurrentes: z.array(EsquemaRecurrenteDinero),
  // Personaje
  objetos: z.array(EsquemaObjetoInventario),
  ventas: z.array(EsquemaVenta),
  inversiones: z.array(EsquemaInversion),
  hechizos: z.array(EsquemaHechizo),
  intentos: z.array(EsquemaIntentoAprendizaje),
  pergaminos: z.array(EsquemaPergamino),
  // Asentamientos
  poblaciones: z.array(EsquemaPoblacion),
  existencias: z.array(EsquemaExistencia),
  ajustesExistencias: z.array(EsquemaAjusteExistencias),
  entradasAlmacen: z.array(EsquemaEntradaAlmacen),
  edificios: z.array(EsquemaEdificio),
  produccionesRealizadas: z.array(EsquemaProduccionRealizada),
  trabajadores: z.array(EsquemaTrabajador),
  obras: z.array(EsquemaObra),
  impuestosRentas: z.array(EsquemaImpuestoRenta),
  tiposLocal: z.array(EsquemaTipoLocal),
  localesComerciales: z.array(EsquemaLocalComercial),
  mercados: z.array(EsquemaMercado),
  rutas: z.array(EsquemaRuta),
  caravanas: z.array(EsquemaCaravana),
  unidadesGuarnicion: z.array(EsquemaUnidadGuarnicion),
  defensas: z.array(EsquemaDefensa),
  animales: z.array(EsquemaAnimal),
  armeria: z.array(EsquemaObjetoArmeria),
  // Partida
  eventos: z.array(EsquemaEventoNarrativo),
  ubicaciones: z.array(EsquemaUbicacion),
  personas: z.array(EsquemaPersonaEntidad),
})
export type EstadoPartida = z.infer<typeof EsquemaEstadoPartida>

/**
 * Un avance con su copia de la partida (§8). Solo el último la lleva (decisión 4): «Deshacer avance» solo
 * deshace el último (§9), así que no hace falta más de un snapshot.
 */
export const EsquemaAvance = EsquemaAvanceRegistrado.extend({
  snapshotPrevio: EsquemaEstadoPartida.optional(),
})
export type Avance = z.infer<typeof EsquemaAvance>

/** Lo que guarda una fila de la tabla `partidas` de Dexie, con clave primaria `partida.id` (decisión 6). */
export const EsquemaDocumentoPartida = EsquemaEstadoPartida.extend({
  avances: z.array(EsquemaAvance),
})
export type DocumentoPartida = z.infer<typeof EsquemaDocumentoPartida>
```

- [ ] **Paso 7: Implementar `resumen.ts`**

Crea `src/dominio/modelo/resumen.ts` con este contenido:

```ts
import { compararFechas, type Fecha } from '../calendario/fecha'
import type { Edad } from '../calendario/formatoFecha'
import type { Id, Instante } from './comunes'
import type { DocumentoPartida } from './documento'
import type { Dominio, DominioAsentamiento } from './dominios'
import { hayAvances } from './partida'

/** Lo que P0 enseña de cada partida sin cargar el documento, más los datos de esta tablet que no viajan (§6.1). */
export interface ResumenPartida {
  id: Id
  nombre: string
  edad: Edad
  fechaInicial: Fecha
  fechaActual: Fecha
  dominios: string[]
  creada: Instante
  actualizada: Instante
  abiertaEl: Instante
  exportadaEl?: Instante
  hayAvances: boolean
}

/** Compara dos cadenas con `<`, sin localeCompare, que depende de la configuración regional (§3.4 del contrato). */
function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Separa los asentamientos del personaje sin perder el tipo de cada uno. */
function esAsentamiento(dominio: Dominio): dominio is DominioAsentamiento {
  return dominio.tipo === 'asentamiento'
}

/** Arma la fila de P0 con el documento y los datos de sesión de esta tablet (§6.1, decisión 9). */
export function resumenDePartida(
  documento: DocumentoPartida,
  sesion: { abiertaEl: Instante; exportadaEl?: Instante },
): ResumenPartida {
  const personaje = documento.dominios.filter((d) => !esAsentamiento(d))
  const asentamientos = documento.dominios
    .filter(esAsentamiento)
    .slice()
    .sort((a, b) => compararFechas(a.alta, b.alta) || compararTexto(a.id, b.id))
  return {
    id: documento.partida.id,
    nombre: documento.partida.nombre,
    edad: documento.partida.edad,
    fechaInicial: documento.partida.fechaInicial,
    fechaActual: documento.partida.fechaActual,
    dominios: [...personaje, ...asentamientos].map((d) => d.nombre),
    creada: documento.partida.creada,
    actualizada: documento.partida.actualizada,
    abiertaEl: sesion.abiertaEl,
    exportadaEl: sesion.exportadaEl,
    hayAvances: hayAvances(documento.partida),
  }
}
```

- [ ] **Paso 8: Ejecutar las pruebas y ver que pasan**

```bash
npx vitest run src/dominio/modelo/catalogos.test.ts src/dominio/modelo/eventos.test.ts src/dominio/modelo/avance.test.ts src/dominio/modelo/documento.test.ts src/dominio/modelo/resumen.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  5 passed (5)
      Tests  13 passed (13)
   Start at  23:03:09
   Duration  1.16s (import 66%, transform 29%, tests 3%, worker 2%)
```

- [ ] **Paso 9: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **339 pruebas en 24 archivos**. Son **18 pruebas nuevas**: las 13 de los cinco archivos de esta tarea y **cinco más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `catalogos.ts`, `eventos.ts`, `avance.ts`, `documento.ts` y `resumen.ts`. Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with fsModuleCache: true»), que no es un fallo:

```text
 Test Files  24 passed (24)
      Tests  339 passed (339)
```

Con esto el modelo de §8 está completo: las **37 entidades** del contrato tienen su esquema y `EsquemaDocumentoPartida` es el tipo que guarda Dexie en la tarea 9 y el que valida la copia en la tarea 15.

- [ ] **Paso 10: Commit**

```bash
git add src/dominio/modelo/catalogos.ts src/dominio/modelo/catalogos.test.ts src/dominio/modelo/eventos.ts src/dominio/modelo/eventos.test.ts src/dominio/modelo/avance.ts src/dominio/modelo/avance.test.ts src/dominio/modelo/documento.ts src/dominio/modelo/documento.test.ts src/dominio/modelo/resumen.ts src/dominio/modelo/resumen.test.ts
git commit -m "feat(modelo): catálogos, eventos, avances, documento de partida y resumen de P0" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/modelo/avance.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/avance.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/catalogos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/catalogos.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/documento.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/documento.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/eventos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/eventos.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/resumen.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/modelo/resumen.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 4d5e6f7] feat(modelo): catálogos, eventos, avances, documento de partida y resumen de P0
 10 files changed, 964 insertions(+)
 create mode 100644 src/dominio/modelo/avance.test.ts
 create mode 100644 src/dominio/modelo/avance.ts
 create mode 100644 src/dominio/modelo/catalogos.test.ts
 create mode 100644 src/dominio/modelo/catalogos.ts
 create mode 100644 src/dominio/modelo/documento.test.ts
 create mode 100644 src/dominio/modelo/documento.ts
 create mode 100644 src/dominio/modelo/eventos.test.ts
 create mode 100644 src/dominio/modelo/eventos.ts
 create mode 100644 src/dominio/modelo/resumen.test.ts
 create mode 100644 src/dominio/modelo/resumen.ts
```

---

### Tarea 7 · `normalizarNombre`

La app compara nombres en muchos sitios: al crear una opción de catálogo desde un desplegable («“Alojamiento” ya existe»), al comprobar que no hay dos ubicaciones ni dos hechizos con el mismo nombre, al fusionar los catálogos de una copia importada con los de esta tablet (decisión 7) y, en la fase 3, al reutilizar la persona de un impago. Todas esas comparaciones usan **la misma** forma normalizada del nombre, y esta tarea la escribe: un módulo de cuatro exportaciones, sin dependencias de ninguna clase, en `src/dominio/texto/normalizar.ts`.

Lo delicado de este módulo es que la ñ **no** equivale a la n, mientras que todas las demás tildes y diéresis sí desaparecen. Se resuelve apartando la ñ en un hueco antes de descomponer el texto en NFD y devolviéndola después. Los dos caracteres que no se ven —el rango de marcas diacríticas y el hueco— se escriben **con escape** (`\u0300`, `\u0001`) y nunca pegados tal cual: un carácter de control invisible en el código fuente es una trampa para quien lo lea o lo copie.

Esta tarea solo depende de la tarea 1 (necesita el proyecto con sus dependencias), pero se ejecuta después de la 6 porque así lo ordena la lista de tareas: la tarea 8 necesita las dos.

**Reglas de la especificación que implementa:**

- **Reglas comunes del nombre (§6.6).** «Se compara sin mayúsculas, tildes, diéresis ni espacios dobles. La ñ no equivale a la n.» Es la frase entera que implementa `normalizarNombre`.
- **Duplicado (§6.6).** «**Duplicado** (bloquea): el nombre ya existe en la lista». Quien decide si algo está duplicado es la tarea 13 (`validacion/unicidades.ts`); lo que necesita de aquí es la forma normalizada con la que comparar.
- **Reservados (§6.6).** «**Reservados** por los filtros: «Todas», «Todos», «Todas las categorías», «Todas las ubicaciones» y «Todos los tipos» («Ese nombre lo usa el filtro»)». Los cinco se guardan **ya normalizados** (sin tildes y en minúsculas), para que `esNombreReservado` sea una comparación directa.
- **Selectores con buscador (§6.5).** «Si una opción coincide exactamente con la búsqueda (sin mayúsculas, tildes ni espacios dobles), no hay acción: el pie dice «“Alojamiento” ya existe» y la opción sale resaltada». La fase 9 pintará ese pie; la comparación es esta.
- **Fusión de catálogos al importar (decisión 7).** «unir las propias por nombre normalizado en su lista». La tarea 16 llama a `normalizarNombre` para eso.
- **Lo que NO entra (§6.6, «Parecido»).** «**Parecido** (no bloquea): coincide al quitar una -s o -es final, o uno contiene al otro con palabras enteras. En personas se compara también lo que va antes de la primera coma». Es un aviso ámbar del formulario, de la fase 9, y no se escribe en este módulo. Tampoco entra aquí la regla del plural de §6.6 («En tipos y oficios, el plural de uno existente también cuenta»), que vive con los catálogos.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/texto/normalizar.ts`
- Prueba: `src/dominio/texto/normalizar.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/texto/` es nueva. La prueba recorre los ejemplos del contrato uno a uno y, además, comprueba lo que de verdad se puede romper: la ñ, los nombres ya normalizados (idempotencia) y los nombres escritos en forma descompuesta (NFD), que es como llegan a veces desde un teclado o desde un archivo importado.

Crea `src/dominio/texto/normalizar.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { esNombreReservado, mismoNombre, NOMBRES_RESERVADOS, normalizarNombre } from './normalizar'

/** Los ejemplos del contrato: entrada y salida esperada. */
const EJEMPLOS: readonly [string, string][] = [
  ['Alojamiento', 'alojamiento'],
  ['  Posada   El  Poney Pisador ', 'posada el poney pisador'],
  ['Canalización', 'canalizacion'],
  ['Torre de vigía', 'torre de vigia'],
  ['Víveres', 'viveres'],
  ['MÜLLER', 'muller'],
  ['Cabaña', 'cabaña'],
  ['Cabana', 'cabana'],
  ['Añil', 'añil'],
  ['Anil', 'anil'],
  ['ALMACÉN DE BREE', 'almacen de bree'],
  ['Gremio de mercaderes de Bree', 'gremio de mercaderes de bree'],
  ['Todas', 'todas'],
]

describe('normalizarNombre', () => {
  it('quita las mayúsculas', () => {
    expect(normalizarNombre('Alojamiento')).toBe('alojamiento')
    expect(normalizarNombre('ALOJAMIENTO')).toBe('alojamiento')
    expect(normalizarNombre('alojamiento')).toBe('alojamiento')
  })

  it('colapsa los espacios repetidos y quita los de los extremos', () => {
    expect(normalizarNombre('  Posada   El  Poney Pisador ')).toBe('posada el poney pisador')
    expect(normalizarNombre('\tAlmacén\nde  Bree ')).toBe('almacen de bree')
    expect(normalizarNombre('   ')).toBe('')
    expect(normalizarNombre('')).toBe('')
  })

  it('quita las tildes y las diéresis', () => {
    expect(normalizarNombre('Canalización')).toBe('canalizacion')
    expect(normalizarNombre('Torre de vigía')).toBe('torre de vigia')
    expect(normalizarNombre('MÜLLER')).toBe('muller')
  })

  it('conserva la ñ, que no equivale a la n', () => {
    expect(normalizarNombre('Cabaña')).toBe('cabaña')
    expect(normalizarNombre('Cabana')).toBe('cabana')
    expect(normalizarNombre('Cabaña')).not.toBe(normalizarNombre('Cabana'))
    expect(normalizarNombre('Añil')).not.toBe(normalizarNombre('Anil'))
  })

  it('da la salida esperada en los trece ejemplos del contrato', () => {
    for (const [entrada, salida] of EJEMPLOS) {
      expect(normalizarNombre(entrada)).toBe(salida)
    }
  })

  it('es idempotente: normalizar lo ya normalizado no cambia nada', () => {
    for (const [entrada, salida] of EJEMPLOS) {
      expect(normalizarNombre(salida)).toBe(salida)
      expect(normalizarNombre(normalizarNombre(entrada))).toBe(salida)
    }
  })

  it('trata igual un nombre tecleado y el mismo nombre descompuesto (NFD)', () => {
    const compuesto = 'Canalización'
    const descompuesto = compuesto.normalize('NFD')
    expect(descompuesto).not.toBe(compuesto)
    expect(normalizarNombre(descompuesto)).toBe('canalizacion')
    expect(normalizarNombre('Cabaña'.normalize('NFD'))).toBe('cabaña')
  })
})

describe('mismoNombre', () => {
  it('dice que sí cuando solo cambian mayúsculas, tildes o espacios', () => {
    expect(mismoNombre('Alojamiento', ' alojamiento ')).toBe(true)
    expect(mismoNombre('Pingüino', 'pinguino')).toBe(true)
    expect(mismoNombre('Posada  El Poney', 'posada el poney')).toBe(true)
  })

  it('dice que no cuando cambia la ñ o el nombre es otro', () => {
    expect(mismoNombre('Año', 'Ano')).toBe(false)
    expect(mismoNombre('Cabaña', 'Cabana')).toBe(false)
    expect(mismoNombre('Alojamiento', 'Alojamientos')).toBe(false)
  })
})

describe('nombres reservados', () => {
  it('guarda los cinco nombres de los filtros, ya normalizados', () => {
    expect(NOMBRES_RESERVADOS).toEqual([
      'todas',
      'todos',
      'todas las categorias',
      'todas las ubicaciones',
      'todos los tipos',
    ])
    for (const reservado of NOMBRES_RESERVADOS) {
      expect(normalizarNombre(reservado)).toBe(reservado)
    }
  })

  it('reconoce el nombre reservado venga como venga, y solo ese', () => {
    expect(esNombreReservado('Todas')).toBe(true)
    expect(esNombreReservado('  TODOS  ')).toBe(true)
    expect(esNombreReservado('Todas las categorías')).toBe(true)
    expect(esNombreReservado('Todas las ubicaciones')).toBe(true)
    expect(esNombreReservado('Todas las posadas')).toBe(false)
    expect(esNombreReservado('Alojamiento')).toBe(false)
  })
})
```

Son **11 pruebas**: 7 de `normalizarNombre`, 2 de `mismoNombre` y 2 de los nombres reservados. `'Alojamiento'` frente a `'Alojamientos'` es **distinto**: la regla del «parecido» de §6.6 no es cosa de este módulo.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/texto/normalizar.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./normalizar`, que todavía no existe. La hora, la duración y el corte de las líneas citadas varían:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/texto/normalizar.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/texto/normalizar.test.ts [ src/dominio/texto/normalizar.test.ts ]
Error: Cannot find module './normalizar' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/texto/normalizar.test.ts
 ❯ src/dominio/texto/normalizar.test.ts:2:1
      1| import { describe, expect, it } from 'vitest'
      2| import { esNombreReservado, mismoNombre, NOMBRES_RESERVADOS, normaliza…
       | ^
      3|
      4| /** Los ejemplos del contrato: entrada y salida esperada. */

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:50:18
   Duration  363ms (worker 97%, environment 3%)
```

- [ ] **Paso 3: Implementar `normalizar.ts`**

Crea `src/dominio/texto/normalizar.ts` con este contenido:

```ts
/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F). */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** Hueco donde se aparta la ñ mientras se quitan las tildes; no es un carácter que se pueda teclear. */
const HUECO_ENIE = '\u0001'

/** El hueco, para devolver la ñ a su sitio al final. */
const REGEX_HUECO_ENIE = new RegExp(HUECO_ENIE, 'g')

/**
 * Nombre en la forma en la que se comparan los duplicados (§6.6): sin mayúsculas, sin tildes ni diéresis,
 * con los espacios colapsados en uno y sin espacios al principio ni al final. La ñ se conserva, porque
 * «no equivale a la n».
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFC')
    .toLowerCase()
    .replace(/ñ/g, HUECO_ENIE)
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .replace(REGEX_HUECO_ENIE, 'ñ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Si dos nombres son el mismo a efectos de duplicado (§6.6). */
export function mismoNombre(a: string, b: string): boolean {
  return normalizarNombre(a) === normalizarNombre(b)
}

/** Nombres que usan los filtros y que ninguna lista puede repetir (§6.6, «Reservados»). */
export const NOMBRES_RESERVADOS: readonly string[] = [
  'todas',
  'todos',
  'todas las categorias',
  'todas las ubicaciones',
  'todos los tipos',
]

/** Si un nombre choca con los que usan los filtros (§6.6): «Ese nombre lo usa el filtro». */
export function esNombreReservado(nombre: string): boolean {
  return NOMBRES_RESERVADOS.includes(normalizarNombre(nombre))
}
```

Por qué el cuerpo está en ese orden y no en otro:

1. `.normalize('NFC')` primero: así una ñ que llegue descompuesta (n + U+0303, como la escriben algunos teclados y algunos archivos) se junta en una sola letra antes de que se la busque.
2. `.toLowerCase()` antes de apartar la ñ: así también se aparta la Ñ.
3. El hueco `\u0001` guarda el sitio de la ñ mientras `NFD` + `MARCAS_DIACRITICAS` se llevan por delante todas las demás tildes y diéresis. Sin él, la ñ se descompondría en n + tilde y la tilde desaparecería: «Cabaña» pasaría a ser «cabana», contra §6.6.
4. Los espacios se colapsan al final, cuando ya no quedan marcas sueltas, y `trim()` quita los de los extremos.

Este módulo **no importa nada**: por eso la prueba de pureza de la tarea 1 lo acepta sin más.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/texto/normalizar.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  22:53:23
   Duration  348ms (transform 61%, import 24%, worker 8%, tests 8%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **351 pruebas en 25 archivos**. La tarea 6 dejó 339 pruebas en 24 archivos, y esta tarea trae **12 nuevas**: las 11 de `normalizar.test.ts` y **una más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/texto/normalizar.ts`.

```text
 Test Files  25 passed (25)
      Tests  351 passed (351)
```

Si el número que ves no es 351, sigue con **el tuyo**: lo que esta tarea garantiza es **+12 pruebas y +1 archivo** sobre lo que dejó la tarea 6. El número de archivos sí es exactamente 25. La tarea 8, la siguiente, suma 16 pruebas y un archivo más.

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/texto/normalizar.ts src/dominio/texto/normalizar.test.ts
git commit -m "feat(texto): comparar nombres sin mayúsculas, tildes ni espacios dobles, con la ñ aparte" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/texto/normalizar.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/texto/normalizar.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 2c3d4e5] feat(texto): comparar nombres sin mayúsculas, tildes ni espacios dobles, con la ñ aparte
 2 files changed, 150 insertions(+)
 create mode 100644 src/dominio/texto/normalizar.test.ts
 create mode 100644 src/dominio/texto/normalizar.ts
```

---

### Tarea 8 · Catálogo inicial de la app

La app trae de fábrica 145 opciones de catálogo (27 categorías de movimiento, 23 oficios, 24 tipos de edificio, 8 tipos de unidad, 6 tipos de defensa y 57 tipos de animal) y 21 recursos, con sus grupos, sus plurales y sus unidades. Todas llevan un identificador fijo y permanente («cat.alojamiento», «defensa.torre-de-vigia»), porque los registros de una partida guardan ese id y una copia importada en otra tablet tiene que reconocerlas. Esta tarea deja esas 166 entradas escritas como una constante pura del dominio, junto con las dos funciones que arman los ids y las dos tablas de ids que usará el motor de las fases 3 a 5 (`CATEGORIA.salarios`, `RECURSO.viveres`). Todavía no se escribe nada en la base de datos: sembrar el catálogo es la tarea 11.

**Reglas de la especificación que implementa:**

- **Ámbito de las listas (§6.5, «Ámbito de las listas»).** Las categorías de movimiento, los oficios, los tipos de edificio, de unidad, de defensa y de animal y los recursos son **de la app** y se comparten entre partidas: «Irá a «Tus categorías» y la verás en todas tus partidas». Las ubicaciones y las personas, en cambio, son de cada partida y no salen en esta tarea.
- **Recuentos de P7 (§6.5 y P7).** P7 agrupa las listas en «CATÁLOGOS DE LA APP» con los recuentos Categorías 27, Oficios 23, Tipos de edificio 24, Tipos de unidad 8, Tipos de defensa 6, Tipos de animal 57 y Recursos 21. (P7 pinta «28 categorías» porque está dibujada después de crear «Posadas del camino» en J2e, que es una categoría **tuya** y no de fábrica.)
- **Opciones protegidas (§6.6, patrón 5).** «Las que llevan candado las pone la app: se renombran, pero no se eliminan». Son las 15 categorías que la app elige sola (Salarios, Soldadas, Tributos, Impuestos, Rentas y alquileres, Aranceles, Beneficios de inversiones, Préstamos y deudas, Venta de objetos, Víveres del almacén, Comercio, Obras, Transferencias, Inversiones y Pergaminos y estudio) más «Otros»: 16 en total.
- **Recursos protegidos (§6.6 y §7, «Reservas»).** «Víveres» ni se renombra ni se elimina (`protegido: 'viveres'`); Cerveza, Madera, Piedra y Arcilla son reservas del almacén y se renombran pero no se eliminan (`protegido: 'reserva'`). Son los cinco que P7 pinta con candado.
- **Convención de ids (decisión 8).** Prefijo por lista (`cat.`, `oficio.`, `edificio.`, `unidad.`, `defensa.`, `animal.` y `recurso.`) más el nombre en minúsculas, sin tildes ni diéresis, con la eñe convertida en `n` y cada tramo que no sea letra o número convertido en un guion. Los ids fijos son **permanentes**: renombrar una opción no cambia su id, porque los registros guardan el id (§6.6, «Renombrar … llega a todas las partidas»).
- **Plural de los oficios (§6.5 n.º 22).** «Cada oficio guarda su plural»; A5 lo usa cuando el número es mayor que 1 («6 Granjeros», «1 Pastor»). Solo los oficios guardan plural: en los demás tipos se propone con la regla de §6.6 y no se guarda.
- **Unidades de los recursos (§6.5 n.º 18 y decisión 10).** Las siete del almacén de Bree salen de las vistas A8 y A10 (saco, haz, carretada, lingote, barril y fardo). Las catorce que la especificación deja sin unidad las fija la decisión 10: Sal y Carbón → saco; Leña → haz; Cuero, Tela y Hierbas → fardo; Herramientas, Armas y Vidrio → caja; Cera → pan; Carne, Vino y Pescado → barril; Oro en bruto → lingote.
- **Nombres comparables (§6.6, «Reglas comunes del nombre»).** Dentro de una lista no puede haber dos nombres iguales al compararlos «sin mayúsculas, tildes, diéresis ni espacios dobles». La prueba lo comprueba sobre el catálogo de fábrica con `normalizarNombre` (tarea 7).
- **El dominio es puro (plan de la fase 1).** `src/dominio/catalogo/inicial.ts` no importa Dexie, ni React, ni APIs del navegador: solo tipos de `src/dominio/modelo/catalogos.ts`. La prueba de pureza de la tarea 1 recorre también este módulo nuevo.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio.

**Archivos:**
- Crear: `src/dominio/catalogo/inicial.ts`
- Prueba: `src/dominio/catalogo/inicial.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La carpeta `src/dominio/catalogo/` es nueva. La prueba comprueba los recuentos, la convención de los ids, la ausencia de nombres repetidos, las dos tablas de ids del motor, las unidades y que cada entrada pasa su esquema Zod.

Crea `src/dominio/catalogo/inicial.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import {
  EsquemaOpcionCatalogo,
  EsquemaRecursoCatalogo,
  type ListaCatalogo,
  type OpcionCatalogo,
} from '../modelo/catalogos'
import { normalizarNombre } from '../texto/normalizar'
import {
  CATEGORIA,
  OPCIONES_INICIALES,
  RECURSO,
  RECURSOS_INICIALES,
  VERSION_CATALOGO,
  idDeOpcion,
  idDeRecurso,
} from './inicial'

/** Las seis listas de opciones de la app (decisión 17). */
const LISTAS: readonly ListaCatalogo[] = [
  'categorias',
  'oficios',
  'tiposEdificio',
  'tiposUnidad',
  'tiposDefensa',
  'tiposAnimal',
]

/** Las opciones de una lista, ya con el tipo de esa lista: así se puede leer `grupo` o `plural`. */
function deLista<L extends ListaCatalogo>(lista: L): Extract<OpcionCatalogo, { lista: L }>[] {
  return OPCIONES_INICIALES.filter((o): o is Extract<OpcionCatalogo, { lista: L }> => o.lista === lista)
}

describe('catálogo inicial de la app', () => {
  it('trae 145 opciones y 21 recursos de fábrica, en la versión 1', () => {
    expect(VERSION_CATALOGO).toBe(1)
    expect(OPCIONES_INICIALES).toHaveLength(145)
    expect(RECURSOS_INICIALES).toHaveLength(21)
  })

  it('reparte las opciones en las seis listas con los recuentos de P7', () => {
    expect(deLista('categorias')).toHaveLength(27)
    expect(deLista('oficios')).toHaveLength(23)
    expect(deLista('tiposEdificio')).toHaveLength(24)
    expect(deLista('tiposUnidad')).toHaveLength(8)
    expect(deLista('tiposDefensa')).toHaveLength(6)
    expect(deLista('tiposAnimal')).toHaveLength(57)
  })

  it('no repite ningún id entre las 166 entradas', () => {
    const ids = [...OPCIONES_INICIALES.map((o) => o.id), ...RECURSOS_INICIALES.map((r) => r.id)]
    expect(ids).toHaveLength(166)
    expect(new Set(ids).size).toBe(166)
  })

  it('da a cada entrada el id fijo que le toca por la convención (decisión 8)', () => {
    for (const opcion of OPCIONES_INICIALES) {
      expect(opcion.id).toBe(idDeOpcion(opcion.lista, opcion.nombre))
    }
    for (const recurso of RECURSOS_INICIALES) {
      expect(recurso.id).toBe(idDeRecurso(recurso.nombre))
    }
  })

  it('arma el id de una opción con el prefijo de su lista', () => {
    expect(idDeOpcion('categorias', 'Alojamiento')).toBe('cat.alojamiento')
    expect(idDeOpcion('categorias', 'Hierbas y curación')).toBe('cat.hierbas-y-curacion')
    expect(idDeOpcion('oficios', 'Leñador')).toBe('oficio.lenador')
    expect(idDeOpcion('tiposEdificio', 'Casa del concejo')).toBe('edificio.casa-del-concejo')
    expect(idDeOpcion('tiposUnidad', 'Capitán')).toBe('unidad.capitan')
    expect(idDeOpcion('tiposDefensa', 'Torre de vigía')).toBe('defensa.torre-de-vigia')
    expect(idDeOpcion('tiposAnimal', 'Caballo de los Rohirrim')).toBe('animal.caballo-de-los-rohirrim')
  })

  it('arma el id de un recurso y no deja guiones sueltos en los extremos', () => {
    expect(idDeRecurso('Víveres')).toBe('recurso.viveres')
    expect(idDeRecurso('Carbón')).toBe('recurso.carbon')
    expect(idDeRecurso('Oro en bruto')).toBe('recurso.oro-en-bruto')
    expect(idDeRecurso('  Cal  ')).toBe('recurso.cal')
  })

  it('no repite ningún nombre normalizado dentro de una lista (§6.6)', () => {
    for (const lista of LISTAS) {
      const nombres = OPCIONES_INICIALES.filter((o) => o.lista === lista).map((o) => normalizarNombre(o.nombre))
      expect(new Set(nombres).size).toBe(nombres.length)
    }
    const recursos = RECURSOS_INICIALES.map((r) => normalizarNombre(r.nombre))
    expect(new Set(recursos).size).toBe(recursos.length)
  })

  it('protege 16 categorías, que son exactamente las de CATEGORIA', () => {
    const protegidas = deLista('categorias').filter((o) => o.protegida === true)
    expect(protegidas).toHaveLength(16)
    expect(protegidas.map((o) => o.id).sort()).toEqual(Object.values(CATEGORIA).sort())
    expect(CATEGORIA.salarios).toBe('cat.salarios')
    expect(CATEGORIA.viveresDelAlmacen).toBe('cat.viveres-del-almacen')
    expect(CATEGORIA.otros).toBe('cat.otros')
  })

  it('nombra en RECURSO los siete recursos del almacén de Bree', () => {
    expect(RECURSO).toEqual({
      viveres: 'recurso.viveres',
      cerveza: 'recurso.cerveza',
      madera: 'recurso.madera',
      piedra: 'recurso.piedra',
      arcilla: 'recurso.arcilla',
      hierro: 'recurso.hierro',
      lana: 'recurso.lana',
    })
    const ids = RECURSOS_INICIALES.map((r) => r.id)
    for (const id of Object.values(RECURSO)) {
      expect(ids).toContain(id)
    }
  })

  it('protege «Víveres» y las cuatro reservas del almacén', () => {
    expect(RECURSOS_INICIALES.filter((r) => r.protegido !== undefined).map((r) => r.id)).toEqual([
      'recurso.viveres',
      'recurso.madera',
      'recurso.piedra',
      'recurso.arcilla',
      'recurso.cerveza',
    ])
    expect(RECURSOS_INICIALES.find((r) => r.id === RECURSO.viveres)?.protegido).toBe('viveres')
    expect(RECURSOS_INICIALES.find((r) => r.id === RECURSO.madera)?.protegido).toBe('reserva')
    expect(RECURSOS_INICIALES.find((r) => r.id === RECURSO.hierro)?.protegido).toBeUndefined()
  })

  it('da a los 21 recursos las unidades de la decisión 10', () => {
    const unidades: Record<string, string> = {}
    for (const recurso of RECURSOS_INICIALES) {
      unidades[recurso.nombre] = `${recurso.unidadSingular} / ${recurso.unidadPlural}`
    }
    expect(unidades).toEqual({
      'Víveres': 'saco / sacos',
      'Madera': 'haz / haces',
      'Piedra': 'carretada / carretadas',
      'Arcilla': 'carretada / carretadas',
      'Hierro': 'lingote / lingotes',
      'Cerveza': 'barril / barriles',
      'Lana': 'fardo / fardos',
      'Sal': 'saco / sacos',
      'Carbón': 'saco / sacos',
      'Leña': 'haz / haces',
      'Cuero': 'fardo / fardos',
      'Tela': 'fardo / fardos',
      'Herramientas': 'caja / cajas',
      'Armas': 'caja / cajas',
      'Vino': 'barril / barriles',
      'Pescado': 'barril / barriles',
      'Carne': 'barril / barriles',
      'Hierbas': 'fardo / fardos',
      'Cera': 'pan / panes',
      'Vidrio': 'caja / cajas',
      'Oro en bruto': 'lingote / lingotes',
    })
  })

  it('da su plural a los 23 oficios (§6.5 n.º 22)', () => {
    const oficios = deLista('oficios')
    expect(oficios).toHaveLength(23)
    for (const oficio of oficios) {
      expect(oficio.plural.length).toBeGreaterThanOrEqual(2)
      expect(oficio.plural).not.toBe(oficio.nombre)
    }
    expect(oficios.map((o) => o.plural).slice(0, 5)).toEqual([
      'Granjeros',
      'Hortelanos',
      'Pastores',
      'Pescadores',
      'Cazadores',
    ])
    expect(oficios.find((o) => o.id === 'oficio.albanil')?.plural).toBe('Albañiles')
  })

  it('agrupa cada opción en un grupo de su lista', () => {
    expect(new Set(deLista('categorias').map((o) => o.grupo))).toEqual(
      new Set(['gastosPersonaje', 'ingresosPersonaje', 'asentamientos', 'otros']),
    )
    expect(new Set(deLista('oficios').map((o) => o.grupo))).toEqual(
      new Set(['campo', 'materiasPrimas', 'oficios', 'servicios']),
    )
    expect(new Set(deLista('tiposEdificio').map((o) => o.grupo))).toEqual(
      new Set(['alimentos', 'materiasPrimas', 'artesania', 'almacenaje', 'servicios']),
    )
    expect(new Set(deLista('tiposUnidad').map((o) => o.grupo))).toEqual(new Set(['tropa', 'mandos']))
    expect(new Set(deLista('tiposAnimal').map((o) => o.grupo)).size).toBe(11)
    expect(deLista('tiposAnimal').filter((o) => o.grupo === 'bovino')).toHaveLength(6)
    expect(deLista('tiposAnimal').filter((o) => o.grupo === 'avesDeCorral')).toHaveLength(12)
  })

  it('no trae nada propio ni borrado', () => {
    expect(OPCIONES_INICIALES.every((o) => o.propia === false && o.borrada === false)).toBe(true)
    expect(RECURSOS_INICIALES.every((r) => r.propia === false && r.borrada === false)).toBe(true)
  })

  it('cada opción y cada recurso pasan su esquema', () => {
    for (const opcion of OPCIONES_INICIALES) {
      expect(EsquemaOpcionCatalogo.safeParse(opcion).success).toBe(true)
    }
    for (const recurso of RECURSOS_INICIALES) {
      expect(EsquemaRecursoCatalogo.safeParse(recurso).success).toBe(true)
    }
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/catalogo/inicial.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./inicial`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/catalogo/inicial.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/catalogo/inicial.test.ts [ src/dominio/catalogo/inicial.test.ts ]
Error: Cannot find module './inicial' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/catalogo/inicial.test.ts
 ❯ src/dominio/catalogo/inicial.test.ts:9:1
      8| import { normalizarNombre } from '../texto/normalizar'
      9| import {
       | ^
     10|   CATEGORIA,
     11|   OPCIONES_INICIALES,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  10:04:11
   Duration  512ms (worker 97%, environment 2%)
```

- [ ] **Paso 3: Implementar `inicial.ts`**

Crea `src/dominio/catalogo/inicial.ts` con este contenido. Los ids van escritos uno a uno, porque son permanentes: la prueba del paso 1 comprueba que cada uno coincide con lo que da `idDeOpcion` o `idDeRecurso`, así que una errata salta enseguida.

```ts
import type { ListaCatalogo, OpcionCatalogo, RecursoCatalogo } from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'

/** Versión del catálogo de fábrica: sube cuando se añaden o cambian opciones de la app (§6.6). */
export const VERSION_CATALOGO = 1

/** Prefijo del id fijo de cada lista (decisión 8). No es la clave de la lista: «tiposDefensa» da «defensa.». */
const PREFIJO_LISTA: Readonly<Record<ListaCatalogo, string>> = {
  categorias: 'cat',
  oficios: 'oficio',
  tiposEdificio: 'edificio',
  tiposUnidad: 'unidad',
  tiposDefensa: 'defensa',
  tiposAnimal: 'animal',
}

/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F). */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** Cada tramo que no es letra sin tilde ni cifra: se convierte en un guion. */
const TRAMOS_NO_ALFANUMERICOS = /[^a-z0-9]+/g

/** Guiones sobrantes al principio y al final del cuerpo del id. */
const GUIONES_DE_LOS_EXTREMOS = /^-+|-+$/g

/**
 * Cuerpo del id fijo (decisión 8): el nombre en minúsculas, sin tildes ni diéresis, con la eñe convertida en
 * «n» y cada tramo que no sea letra o número convertido en un guion. Aquí la eñe **sí** se convierte en «n»,
 * al revés que en normalizarNombre (§6.6), que la conserva porque «la ñ no equivale a la n» al comparar.
 */
function cuerpoDeId(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(TRAMOS_NO_ALFANUMERICOS, '-')
    .replace(GUIONES_DE_LOS_EXTREMOS, '')
}

/** Id fijo de una opción de la app: idDeOpcion('tiposDefensa', 'Torre de vigía') === 'defensa.torre-de-vigia'. */
export function idDeOpcion(lista: ListaCatalogo, nombre: string): Id {
  return `${PREFIJO_LISTA[lista]}.${cuerpoDeId(nombre)}`
}

/** Id fijo de un recurso de la app: idDeRecurso('Oro en bruto') === 'recurso.oro-en-bruto' (decisión 8). */
export function idDeRecurso(nombre: string): Id {
  return `recurso.${cuerpoDeId(nombre)}`
}

type Categoria = Extract<OpcionCatalogo, { lista: 'categorias' }>
type Oficio = Extract<OpcionCatalogo, { lista: 'oficios' }>
type TipoEdificio = Extract<OpcionCatalogo, { lista: 'tiposEdificio' }>
type TipoUnidad = Extract<OpcionCatalogo, { lista: 'tiposUnidad' }>
type TipoDefensa = Extract<OpcionCatalogo, { lista: 'tiposDefensa' }>
type TipoAnimal = Extract<OpcionCatalogo, { lista: 'tiposAnimal' }>

/** Una categoría de fábrica. `protegida` es el candado de P7: se renombra, pero no se elimina (§6.6). */
function categoria(id: Id, nombre: string, grupo: Categoria['grupo'], protegida: boolean): Categoria {
  return { id, nombre, lista: 'categorias', grupo, propia: false, borrada: false, protegida }
}

/** Un oficio de fábrica. Es la única lista que guarda plural (§6.5 n.º 22). */
function oficio(id: Id, nombre: string, plural: string, grupo: Oficio['grupo']): Oficio {
  return { id, nombre, lista: 'oficios', grupo, plural, propia: false, borrada: false, protegida: false }
}

/** Un tipo de edificio de fábrica (§6.5 n.º 20). «El tipo no trae producción». */
function tipoEdificio(id: Id, nombre: string, grupo: TipoEdificio['grupo']): TipoEdificio {
  return { id, nombre, lista: 'tiposEdificio', grupo, propia: false, borrada: false, protegida: false }
}

/** Un tipo de unidad de guarnición de fábrica (§6.5 n.º 23). El nombre de la unidad va en la unidad. */
function tipoUnidad(id: Id, nombre: string, grupo: TipoUnidad['grupo']): TipoUnidad {
  return { id, nombre, lista: 'tiposUnidad', grupo, propia: false, borrada: false, protegida: false }
}

/** Un tipo de defensa de fábrica (§6.5 n.º 24). Es la única lista sin grupos. */
function tipoDefensa(id: Id, nombre: string): TipoDefensa {
  return { id, nombre, lista: 'tiposDefensa', propia: false, borrada: false, protegida: false }
}

/** Un tipo de animal de fábrica (§6.5 n.º 34). */
function tipoAnimal(id: Id, nombre: string, grupo: TipoAnimal['grupo']): TipoAnimal {
  return { id, nombre, lista: 'tiposAnimal', grupo, propia: false, borrada: false, protegida: false }
}

/** Un recurso de fábrica, con su unidad en singular y en plural (§6.5 n.º 18, decisión 10). */
function recurso(
  id: Id,
  nombre: string,
  unidadSingular: string,
  unidadPlural: string,
  protegido?: 'viveres' | 'reserva',
): RecursoCatalogo {
  return { id, nombre, unidadSingular, unidadPlural, propia: false, borrada: false, protegido }
}

/** Las 27 categorías de movimiento de fábrica (§6.5 n.º 6). Las 16 protegidas son las que elige la app sola. */
const CATEGORIAS: readonly Categoria[] = [
  categoria('cat.alojamiento', 'Alojamiento', 'gastosPersonaje', false),
  categoria('cat.comida-y-bebida', 'Comida y bebida', 'gastosPersonaje', false),
  categoria('cat.montura', 'Montura', 'gastosPersonaje', false),
  categoria('cat.equipo', 'Equipo', 'gastosPersonaje', false),
  categoria('cat.armas-y-armaduras', 'Armas y armaduras', 'gastosPersonaje', false),
  categoria('cat.hierbas-y-curacion', 'Hierbas y curación', 'gastosPersonaje', false),
  categoria('cat.pergaminos-y-estudio', 'Pergaminos y estudio', 'gastosPersonaje', true),
  categoria('cat.viajes-y-peajes', 'Viajes y peajes', 'gastosPersonaje', false),
  categoria('cat.sobornos-y-regalos', 'Sobornos y regalos', 'gastosPersonaje', false),
  categoria('cat.gastos-recurrentes', 'Gastos recurrentes', 'gastosPersonaje', false),
  categoria('cat.recompensas', 'Recompensas', 'ingresosPersonaje', false),
  categoria('cat.venta-de-objetos', 'Venta de objetos', 'ingresosPersonaje', true),
  categoria('cat.beneficios-de-inversiones', 'Beneficios de inversiones', 'ingresosPersonaje', true),
  categoria('cat.prestamos-y-deudas', 'Préstamos y deudas', 'ingresosPersonaje', true),
  categoria('cat.impuestos', 'Impuestos', 'asentamientos', true),
  categoria('cat.rentas-y-alquileres', 'Rentas y alquileres', 'asentamientos', true),
  categoria('cat.aranceles', 'Aranceles', 'asentamientos', true),
  categoria('cat.salarios', 'Salarios', 'asentamientos', true),
  categoria('cat.soldadas', 'Soldadas', 'asentamientos', true),
  categoria('cat.tributos', 'Tributos', 'asentamientos', true),
  categoria('cat.obras', 'Obras', 'asentamientos', true),
  categoria('cat.comercio', 'Comercio', 'asentamientos', true),
  categoria('cat.viveres-del-almacen', 'Víveres del almacén', 'asentamientos', true),
  categoria('cat.transferencias', 'Transferencias', 'otros', true),
  categoria('cat.inversiones', 'Inversiones', 'otros', true),
  categoria('cat.ajustes', 'Ajustes', 'otros', false),
  categoria('cat.otros', 'Otros', 'otros', true),
]

/** Los 23 oficios de fábrica, con su plural (§6.5 n.º 22). */
const OFICIOS: readonly Oficio[] = [
  oficio('oficio.granjero', 'Granjero', 'Granjeros', 'campo'),
  oficio('oficio.hortelano', 'Hortelano', 'Hortelanos', 'campo'),
  oficio('oficio.pastor', 'Pastor', 'Pastores', 'campo'),
  oficio('oficio.pescador', 'Pescador', 'Pescadores', 'campo'),
  oficio('oficio.cazador', 'Cazador', 'Cazadores', 'campo'),
  oficio('oficio.lenador', 'Leñador', 'Leñadores', 'materiasPrimas'),
  oficio('oficio.cantero', 'Cantero', 'Canteros', 'materiasPrimas'),
  oficio('oficio.minero', 'Minero', 'Mineros', 'materiasPrimas'),
  oficio('oficio.molinero', 'Molinero', 'Molineros', 'oficios'),
  oficio('oficio.panadero', 'Panadero', 'Panaderos', 'oficios'),
  oficio('oficio.cervecero', 'Cervecero', 'Cerveceros', 'oficios'),
  oficio('oficio.herrero', 'Herrero', 'Herreros', 'oficios'),
  oficio('oficio.carpintero', 'Carpintero', 'Carpinteros', 'oficios'),
  oficio('oficio.albanil', 'Albañil', 'Albañiles', 'oficios'),
  oficio('oficio.tejedor', 'Tejedor', 'Tejedores', 'oficios'),
  oficio('oficio.curtidor', 'Curtidor', 'Curtidores', 'oficios'),
  oficio('oficio.alfarero', 'Alfarero', 'Alfareros', 'oficios'),
  oficio('oficio.posadero', 'Posadero', 'Posaderos', 'servicios'),
  oficio('oficio.mercader', 'Mercader', 'Mercaderes', 'servicios'),
  oficio('oficio.carretero', 'Carretero', 'Carreteros', 'servicios'),
  oficio('oficio.criado', 'Criado', 'Criados', 'servicios'),
  oficio('oficio.escriba', 'Escriba', 'Escribas', 'servicios'),
  oficio('oficio.sanador', 'Sanador', 'Sanadores', 'servicios'),
]

/** Los 24 tipos de edificio de fábrica (§6.5 n.º 20). «Horno» va en Alimentos, como dice §6.6. */
const TIPOS_EDIFICIO: readonly TipoEdificio[] = [
  tipoEdificio('edificio.granja', 'Granja', 'alimentos'),
  tipoEdificio('edificio.huerto', 'Huerto', 'alimentos'),
  tipoEdificio('edificio.redil', 'Redil', 'alimentos'),
  tipoEdificio('edificio.establo', 'Establo', 'alimentos'),
  tipoEdificio('edificio.molino', 'Molino', 'alimentos'),
  tipoEdificio('edificio.horno', 'Horno', 'alimentos'),
  tipoEdificio('edificio.panaderia', 'Panadería', 'alimentos'),
  tipoEdificio('edificio.cerveceria', 'Cervecería', 'alimentos'),
  tipoEdificio('edificio.aserradero', 'Aserradero', 'materiasPrimas'),
  tipoEdificio('edificio.cantera', 'Cantera', 'materiasPrimas'),
  tipoEdificio('edificio.mina', 'Mina', 'materiasPrimas'),
  tipoEdificio('edificio.herreria', 'Herrería', 'artesania'),
  tipoEdificio('edificio.carpinteria', 'Carpintería', 'artesania'),
  tipoEdificio('edificio.telar', 'Telar', 'artesania'),
  tipoEdificio('edificio.curtiduria', 'Curtiduría', 'artesania'),
  tipoEdificio('edificio.alfareria', 'Alfarería', 'artesania'),
  tipoEdificio('edificio.granero', 'Granero', 'almacenaje'),
  tipoEdificio('edificio.almacen', 'Almacén', 'almacenaje'),
  tipoEdificio('edificio.mercado', 'Mercado', 'servicios'),
  tipoEdificio('edificio.posada', 'Posada', 'servicios'),
  tipoEdificio('edificio.taberna', 'Taberna', 'servicios'),
  tipoEdificio('edificio.santuario', 'Santuario', 'servicios'),
  tipoEdificio('edificio.casa-del-concejo', 'Casa del concejo', 'servicios'),
  tipoEdificio('edificio.muelle', 'Muelle', 'servicios'),
]

/** Los 8 tipos de unidad de fábrica (§6.5 n.º 23). «Tropa» es el grupo inicial de una unidad nueva. */
const TIPOS_UNIDAD: readonly TipoUnidad[] = [
  tipoUnidad('unidad.guardia', 'Guardia', 'tropa'),
  tipoUnidad('unidad.arquero', 'Arquero', 'tropa'),
  tipoUnidad('unidad.lancero', 'Lancero', 'tropa'),
  tipoUnidad('unidad.jinete', 'Jinete', 'tropa'),
  tipoUnidad('unidad.explorador', 'Explorador', 'tropa'),
  tipoUnidad('unidad.milicia', 'Milicia', 'tropa'),
  tipoUnidad('unidad.sargento', 'Sargento', 'mandos'),
  tipoUnidad('unidad.capitan', 'Capitán', 'mandos'),
]

/** Los 6 tipos de defensa de fábrica (§6.5 n.º 24). P7 los muestra sin grupo. */
const TIPOS_DEFENSA: readonly TipoDefensa[] = [
  tipoDefensa('defensa.empalizada', 'Empalizada'),
  tipoDefensa('defensa.muralla', 'Muralla'),
  tipoDefensa('defensa.puerta', 'Puerta'),
  tipoDefensa('defensa.torre-de-vigia', 'Torre de vigía'),
  tipoDefensa('defensa.atalaya', 'Atalaya'),
  tipoDefensa('defensa.foso', 'Foso'),
]

/** Los 57 tipos de animal de fábrica, en los 11 grupos que enumera §6.5 n.º 34. */
const TIPOS_ANIMAL: readonly TipoAnimal[] = [
  tipoAnimal('animal.vaca', 'Vaca', 'bovino'),
  tipoAnimal('animal.toro', 'Toro', 'bovino'),
  tipoAnimal('animal.buey', 'Buey', 'bovino'),
  tipoAnimal('animal.ternero', 'Ternero', 'bovino'),
  tipoAnimal('animal.ternera', 'Ternera', 'bovino'),
  tipoAnimal('animal.vaquilla', 'Vaquilla', 'bovino'),
  tipoAnimal('animal.caballo-de-tiro', 'Caballo de tiro', 'caballar'),
  tipoAnimal('animal.caballo-de-silla', 'Caballo de silla', 'caballar'),
  tipoAnimal('animal.caballo-de-guerra', 'Caballo de guerra', 'caballar'),
  tipoAnimal('animal.caballo-de-los-rohirrim', 'Caballo de los Rohirrim', 'caballar'),
  tipoAnimal('animal.yegua', 'Yegua', 'caballar'),
  tipoAnimal('animal.potro', 'Potro', 'caballar'),
  tipoAnimal('animal.poni', 'Poni', 'caballar'),
  tipoAnimal('animal.poni-de-la-comarca', 'Poni de la Comarca', 'caballar'),
  tipoAnimal('animal.mula', 'Mula', 'caballar'),
  tipoAnimal('animal.asno', 'Asno', 'caballar'),
  tipoAnimal('animal.oveja', 'Oveja', 'ovinoYCaprino'),
  tipoAnimal('animal.carnero', 'Carnero', 'ovinoYCaprino'),
  tipoAnimal('animal.cordero', 'Cordero', 'ovinoYCaprino'),
  tipoAnimal('animal.cabra', 'Cabra', 'ovinoYCaprino'),
  tipoAnimal('animal.macho-cabrio', 'Macho cabrío', 'ovinoYCaprino'),
  tipoAnimal('animal.cabrito', 'Cabrito', 'ovinoYCaprino'),
  tipoAnimal('animal.cerdo', 'Cerdo', 'porcino'),
  tipoAnimal('animal.cerda', 'Cerda', 'porcino'),
  tipoAnimal('animal.verraco', 'Verraco', 'porcino'),
  tipoAnimal('animal.lechon', 'Lechón', 'porcino'),
  tipoAnimal('animal.gallina', 'Gallina', 'avesDeCorral'),
  tipoAnimal('animal.gallo', 'Gallo', 'avesDeCorral'),
  tipoAnimal('animal.pollo', 'Pollo', 'avesDeCorral'),
  tipoAnimal('animal.capon', 'Capón', 'avesDeCorral'),
  tipoAnimal('animal.pato', 'Pato', 'avesDeCorral'),
  tipoAnimal('animal.oca', 'Oca', 'avesDeCorral'),
  tipoAnimal('animal.pavo', 'Pavo', 'avesDeCorral'),
  tipoAnimal('animal.paloma', 'Paloma', 'avesDeCorral'),
  tipoAnimal('animal.codorniz', 'Codorniz', 'avesDeCorral'),
  tipoAnimal('animal.faisan', 'Faisán', 'avesDeCorral'),
  tipoAnimal('animal.pavo-real', 'Pavo real', 'avesDeCorral'),
  tipoAnimal('animal.cisne', 'Cisne', 'avesDeCorral'),
  tipoAnimal('animal.perro-pastor', 'Perro pastor', 'perrosYGatos'),
  tipoAnimal('animal.perro-de-caza', 'Perro de caza', 'perrosYGatos'),
  tipoAnimal('animal.mastin', 'Mastín', 'perrosYGatos'),
  tipoAnimal('animal.lebrel', 'Lebrel', 'perrosYGatos'),
  tipoAnimal('animal.perro-guardian', 'Perro guardián', 'perrosYGatos'),
  tipoAnimal('animal.gato', 'Gato', 'perrosYGatos'),
  tipoAnimal('animal.halcon', 'Halcón', 'cetreria'),
  tipoAnimal('animal.azor', 'Azor', 'cetreria'),
  tipoAnimal('animal.huron', 'Hurón', 'cetreria'),
  tipoAnimal('animal.conejo', 'Conejo', 'pequeniosAnimales'),
  tipoAnimal('animal.colmena-de-abejas', 'Colmena de abejas', 'pequeniosAnimales'),
  tipoAnimal('animal.gusanos-de-seda', 'Gusanos de seda', 'pequeniosAnimales'),
  tipoAnimal('animal.camello', 'Camello', 'cargaExotica'),
  tipoAnimal('animal.olifante', 'Olifante', 'cargaExotica'),
  tipoAnimal('animal.carpa', 'Carpa', 'estanques'),
  tipoAnimal('animal.trucha', 'Trucha', 'estanques'),
  tipoAnimal('animal.ciervo', 'Ciervo', 'enCercado'),
  tipoAnimal('animal.jabali', 'Jabalí', 'enCercado'),
  tipoAnimal('animal.oso-amaestrado', 'Oso amaestrado', 'enCercado'),
]

/** Las 145 opciones de fábrica: 27 categorías, 23 oficios, 24 tipos de edificio, 8 de unidad, 6 de defensa y 57 de animal (§6.5). */
export const OPCIONES_INICIALES: readonly OpcionCatalogo[] = [
  ...CATEGORIAS,
  ...OFICIOS,
  ...TIPOS_EDIFICIO,
  ...TIPOS_UNIDAD,
  ...TIPOS_DEFENSA,
  ...TIPOS_ANIMAL,
]

/** Los 21 recursos de fábrica, con sus unidades en singular y plural (§6.5 n.º 18, decisión 10). */
export const RECURSOS_INICIALES: readonly RecursoCatalogo[] = [
  recurso('recurso.viveres', 'Víveres', 'saco', 'sacos', 'viveres'),
  recurso('recurso.madera', 'Madera', 'haz', 'haces', 'reserva'),
  recurso('recurso.piedra', 'Piedra', 'carretada', 'carretadas', 'reserva'),
  recurso('recurso.arcilla', 'Arcilla', 'carretada', 'carretadas', 'reserva'),
  recurso('recurso.hierro', 'Hierro', 'lingote', 'lingotes'),
  recurso('recurso.cerveza', 'Cerveza', 'barril', 'barriles', 'reserva'),
  recurso('recurso.lana', 'Lana', 'fardo', 'fardos'),
  recurso('recurso.sal', 'Sal', 'saco', 'sacos'),
  recurso('recurso.carbon', 'Carbón', 'saco', 'sacos'),
  recurso('recurso.lena', 'Leña', 'haz', 'haces'),
  recurso('recurso.cuero', 'Cuero', 'fardo', 'fardos'),
  recurso('recurso.tela', 'Tela', 'fardo', 'fardos'),
  recurso('recurso.herramientas', 'Herramientas', 'caja', 'cajas'),
  recurso('recurso.armas', 'Armas', 'caja', 'cajas'),
  recurso('recurso.vino', 'Vino', 'barril', 'barriles'),
  recurso('recurso.pescado', 'Pescado', 'barril', 'barriles'),
  recurso('recurso.carne', 'Carne', 'barril', 'barriles'),
  recurso('recurso.hierbas', 'Hierbas', 'fardo', 'fardos'),
  recurso('recurso.cera', 'Cera', 'pan', 'panes'),
  recurso('recurso.vidrio', 'Vidrio', 'caja', 'cajas'),
  recurso('recurso.oro-en-bruto', 'Oro en bruto', 'lingote', 'lingotes'),
]

/** Ids fijos de las categorías que usa el motor: CATEGORIA.salarios === 'cat.salarios' (§9). Son las 16 protegidas. */
export const CATEGORIA: Readonly<
  Record<
    | 'salarios'
    | 'soldadas'
    | 'tributos'
    | 'impuestos'
    | 'rentasYAlquileres'
    | 'aranceles'
    | 'beneficiosDeInversiones'
    | 'prestamosYDeudas'
    | 'ventaDeObjetos'
    | 'viveresDelAlmacen'
    | 'comercio'
    | 'obras'
    | 'transferencias'
    | 'inversiones'
    | 'pergaminosYEstudio'
    | 'otros',
    Id
  >
> = {
  salarios: 'cat.salarios',
  soldadas: 'cat.soldadas',
  tributos: 'cat.tributos',
  impuestos: 'cat.impuestos',
  rentasYAlquileres: 'cat.rentas-y-alquileres',
  aranceles: 'cat.aranceles',
  beneficiosDeInversiones: 'cat.beneficios-de-inversiones',
  prestamosYDeudas: 'cat.prestamos-y-deudas',
  ventaDeObjetos: 'cat.venta-de-objetos',
  viveresDelAlmacen: 'cat.viveres-del-almacen',
  comercio: 'cat.comercio',
  obras: 'cat.obras',
  transferencias: 'cat.transferencias',
  inversiones: 'cat.inversiones',
  pergaminosYEstudio: 'cat.pergaminos-y-estudio',
  otros: 'cat.otros',
}

/** Ids fijos de los recursos que usa el motor: RECURSO.viveres === 'recurso.viveres' (§7). */
export const RECURSO: Readonly<Record<'viveres' | 'cerveza' | 'madera' | 'piedra' | 'arcilla' | 'hierro' | 'lana', Id>> =
  {
    viveres: 'recurso.viveres',
    cerveza: 'recurso.cerveza',
    madera: 'recurso.madera',
    piedra: 'recurso.piedra',
    arcilla: 'recurso.arcilla',
    hierro: 'recurso.hierro',
    lana: 'recurso.lana',
  }
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/catalogo/inicial.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  10:05:22
   Duration  461ms (transform 52%, import 30%, worker 11%, tests 7%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que una opción no encaja con su lista en la unión discriminada de `EsquemaOpcionCatalogo`; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 367 pruebas en 26 archivos. Son **16 pruebas nuevas**: las 15 de `inicial.test.ts` y **una más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/catalogo/inicial.ts`.

```text
 Test Files  26 passed (26)
      Tests  367 passed (367)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/catalogo/inicial.ts src/dominio/catalogo/inicial.test.ts
git commit -m "feat(catalogo): las 145 opciones y los 21 recursos de fábrica con sus ids fijos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/catalogo/inicial.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/catalogo/inicial.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 4c19e07] feat(catalogo): las 145 opciones y los 21 recursos de fábrica con sus ids fijos
 2 files changed, 557 insertions(+)
 create mode 100644 src/dominio/catalogo/inicial.test.ts
 create mode 100644 src/dominio/catalogo/inicial.ts
```

---

### Tarea 9 · Base de datos con Dexie

Abre la puerta de IndexedDB. Hasta aquí la fase 2 solo ha escrito dominio puro; esta tarea crea la clase `BaseDeDatos` con las cinco tablas de la app (partidas, resúmenes, opciones de catálogo, recursos de catálogo y ajustes), el ayudante que usan las pruebas para trabajar sobre una `IDBFactory` falsa y `nuevoId()`, que es lo único del proyecto que toca `crypto`. Todavía no hay repositorio ni siembra: guardar y listar partidas es la tarea 10 y sembrar el catálogo, la tarea 11.

**Reglas de la especificación que implementa:**

- **Todo se guarda en la tablet (§2, «Datos»).** «Local en el dispositivo, funciona sin conexión. Varias partidas. Copia de seguridad exportable e importable (JSON): cada copia es una partida completa». La tecnología la fija §11: «almacenamiento en IndexedDB».
- **Una partida es un documento (decisión 6).** El documento guardado es `{ partida, …colecciones…, avances }`, con la partida en la raíz y sin `partidaId` dentro. Por eso la clave primaria de la tabla `partidas` es la clave anidada `partida.id`, que IndexedDB admite porque acepta *keyPath* con puntos.
- **P0 no abre el documento para pintar la lista (§6.1, P0).** «Partidas guardadas (nombre, fecha en juego, dominios, última sesión)». Eso vive en una tabla aparte, `resumenes`, con índices por `abiertaEl` (la última sesión) y por `actualizada` (decisión 9). La tarea 10 la rellena.
- **Los catálogos son de la app, no de la partida (§6.5, «Ámbito de las listas»).** «Los catálogos (categorías, oficios, tipos de edificio, de unidad, de defensa y de animal, y recursos) son de la app y se comparten entre partidas». Van en `opcionesCatalogo` (con índice por `lista`, decisión 17) y `recursosCatalogo`, fuera de las partidas.
- **Una sola base, no varias.** Una transacción de IndexedDB no puede abarcar dos bases, y la app necesita escribir a la vez una partida y el catálogo (importar una copia, decisión 14) y, en la fase 9, reasignar una opción «a los registros actuales y al snapshotPrevio del último avance de cada partida afectada» (§6.6, patrón 5). Con una sola base eso es una transacción; con dos, no se puede.
- **Ids nuevos (decisión 8).** «En la app, los ids nuevos son `crypto.randomUUID()`». Como `crypto` es del navegador, `nuevoId()` vive en `src/datos` y **no** en el dominio: la prueba de pureza de la tarea 1 prohíbe `crypto` en `src/dominio`. Las funciones puras que necesitan ids nuevos (la fusión de catálogos, tarea 16) lo reciben como parámetro.
- **Dos versiones distintas, que no se confunden.** `VERSION_BASE` es la versión de la estructura de Dexie (tablas e índices) y `VERSION_FORMATO` (tarea 3) es la del contenido del documento, que es la que viaja en la copia (§6.1). Las dos valen 1 en la fase 2.

Detalles de Dexie 4.4.6 que hay que respetar y que están comprobados sobre la biblioteca real:

- Con `erasableSyntaxOnly` en `tsconfig.app.json`, los campos de la clase van con `declare`: no emiten nada en tiempo de ejecución y no pisan las propiedades que crea Dexie.
- Dexie lee `globalThis.indexedDB` **una sola vez, al cargar el módulo**: reasignar esa variable global después no cambia la fábrica que usa. Por eso las pruebas inyectan la fábrica por el constructor (`DexieOptions`) y no con `fake-indexeddb/auto`. Así `globalThis.indexedDB` sigue sin existir y la prueba de pureza del dominio sigue teniendo sentido.
- `db.close()` y `db.delete()` **desactivan la reapertura automática**: después, cualquier operación lanza `DatabaseClosedError`. Las pruebas cierran la base en `afterEach` y no la vuelven a usar; nunca llaman a `db.delete()` sin `{ disableAutoOpen: false }`.
- Dentro de `db.transaction('rw', …)` solo se hacen operaciones de IndexedDB: nada de `fetch`, `setTimeout` ni `await null`, o la transacción se cierra sola y salta `PrematureCommitError`.
- IndexedDB guarda con *structured clone* y **conserva las propiedades con valor `undefined`**, mientras que `JSON.stringify` las quita. Al comparar lo leído con lo escrito se usa `toEqual`, **no** `toStrictEqual`.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/datos/baseDeDatos.ts`, `src/datos/pruebas/baseDePrueba.ts`, `src/datos/ids.ts`
- Modificar: `src/datos/humo.test.ts` (pasa a usar `baseDePrueba()` en vez de la base que declaraba a mano en la tarea 1)
- Prueba: `src/datos/baseDeDatos.test.ts`, `src/datos/ids.test.ts`

- [ ] **Paso 1: Escribir las dos pruebas que fallan**

La carpeta `src/datos/pruebas/` es nueva. Las dos pruebas se escriben a la vez porque las dos se implementan en esta misma tarea y ninguna depende de la otra.

La prueba de la base comprueba las cinco tablas con sus claves primarias e índices, la clave anidada `partida.id`, los dos índices que usará la tarea 10, que una excepción deshace la transacción entera y que lo leído es igual a lo escrito.

Crea `src/datos/baseDeDatos.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dominio/dinero/monedas'
import type { OpcionCatalogo } from '../dominio/modelo/catalogos'
import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { VERSION_FORMATO } from '../dominio/modelo/partida'
import type { ResumenPartida } from '../dominio/modelo/resumen'
import { type BaseDeDatos, VERSION_BASE } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'

/** Instante fijo para que las pruebas no dependan del reloj. */
const CREADA: Instante = '2026-09-17T09:00:00.000Z'

/**
 * Documento mínimo y completo: la cabecera de la partida, un personaje con su bolsa y las 32 colecciones
 * restantes vacías. Son las 34 claves de EsquemaEstadoPartida más `avances` (tarea 6).
 */
function documentoDePrueba(id: Id, nombre: string): DocumentoPartida {
  return {
    partida: {
      id,
      nombre,
      edad: 'tercera',
      equivalencias: EQUIVALENCIAS_POR_DEFECTO,
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 1, dia: 1 },
      fechaActual: { anio: 1640, mes: 1, dia: 1 },
      creada: CREADA,
      actualizada: CREADA,
      versionFormato: VERSION_FORMATO,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [{ id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' }],
    cajas: [{ dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } }],
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
    avances: [],
  }
}

/** Fila de P0 escrita a mano: quien la arma de verdad es resumenDePartida, en la tarea 10. */
function resumenDePrueba(id: Id, nombre: string, abiertaEl: Instante): ResumenPartida {
  return {
    id,
    nombre,
    edad: 'tercera',
    fechaInicial: { anio: 1640, mes: 1, dia: 1 },
    fechaActual: { anio: 1640, mes: 1, dia: 1 },
    dominios: ['Tharan'],
    creada: CREADA,
    actualizada: CREADA,
    abiertaEl,
    hayAvances: false,
  }
}

/** Una categoría de catálogo, con los campos que lleva en esta tablet (tarea 6). */
function categoria(id: Id, nombre: string): OpcionCatalogo {
  return { id, nombre, lista: 'categorias', grupo: 'gastosPersonaje', propia: false, borrada: false, protegida: false }
}

/** Un oficio, que es la única lista que guarda plural. */
function oficio(id: Id, nombre: string, plural: string): OpcionCatalogo {
  return {
    id,
    nombre,
    lista: 'oficios',
    grupo: 'campo',
    plural,
    propia: false,
    borrada: false,
    protegida: false,
  }
}

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('estructura de la base', () => {
  it('abre con la versión 1 y sus cinco tablas, cada una con su clave primaria', async () => {
    await db.open()
    expect(db.verno).toBe(VERSION_BASE)
    expect(db.tables.map((tabla) => tabla.name).sort()).toEqual([
      'ajustes',
      'opcionesCatalogo',
      'partidas',
      'recursosCatalogo',
      'resumenes',
    ])
    expect(db.partidas.schema.primKey.keyPath).toBe('partida.id')
    expect(db.resumenes.schema.primKey.keyPath).toBe('id')
    expect(db.opcionesCatalogo.schema.primKey.keyPath).toBe('id')
    expect(db.recursosCatalogo.schema.primKey.keyPath).toBe('id')
    expect(db.ajustes.schema.primKey.keyPath).toBe('clave')
    expect(db.resumenes.schema.indexes.map((indice) => indice.name)).toEqual(['abiertaEl', 'actualizada'])
    expect(db.opcionesCatalogo.schema.indexes.map((indice) => indice.name)).toEqual(['lista'])
  })

  it('guarda y lee un documento de partida por su clave anidada partida.id', async () => {
    const documento = documentoDePrueba('p.sombra-del-este', 'La Sombra del Este')
    await db.partidas.put(documento)
    expect(await db.partidas.get('p.sombra-del-este')).toEqual(documento)
    expect(await db.partidas.get('p.no-existe')).toBeUndefined()
  })

  it('los índices ordenan los resúmenes por abiertaEl y filtran las opciones por lista', async () => {
    await db.resumenes.bulkPut([
      resumenDePrueba('p.sombra-del-este', 'La Sombra del Este', '2026-09-16T20:00:00.000Z'),
      resumenDePrueba('p.senderos-del-norte', 'Los Senderos del Norte', '2026-09-17T08:30:00.000Z'),
    ])
    const porSesion = await db.resumenes.orderBy('abiertaEl').reverse().toArray()
    expect(porSesion.map((resumen) => resumen.id)).toEqual(['p.senderos-del-norte', 'p.sombra-del-este'])

    await db.opcionesCatalogo.bulkPut([
      categoria('cat.alojamiento', 'Alojamiento'),
      categoria('cat.montura', 'Montura'),
      oficio('oficio.granjero', 'Granjero', 'Granjeros'),
    ])
    const categorias = await db.opcionesCatalogo.where('lista').equals('categorias').toArray()
    expect(categorias.map((opcion) => opcion.id).sort()).toEqual(['cat.alojamiento', 'cat.montura'])
  })
})

describe('transacciones', () => {
  it('una excepción dentro de una transacción rw deja las dos tablas como estaban', async () => {
    await expect(
      db.transaction('rw', db.partidas, db.resumenes, async () => {
        await db.partidas.put(documentoDePrueba('p.sombra-del-este', 'La Sombra del Este'))
        await db.resumenes.put(resumenDePrueba('p.sombra-del-este', 'La Sombra del Este', CREADA))
        throw new Error('algo va mal a mitad de la escritura')
      }),
    ).rejects.toThrow('algo va mal a mitad de la escritura')
    expect(await db.partidas.count()).toBe(0)
    expect(await db.resumenes.count()).toBe(0)
  })
})

describe('ajustes de la app', () => {
  it('guardan cualquier valor por su clave y conservan las propiedades con valor undefined', async () => {
    await db.ajustes.put({ clave: 'versionCatalogo', valor: { numero: 1, notas: undefined } })
    const fila = await db.ajustes.get('versionCatalogo')
    expect(fila).toEqual({ clave: 'versionCatalogo', valor: { numero: 1, notas: undefined } })
    // IndexedDB guarda con structured clone y conserva las claves con valor undefined; JSON las quita.
    // Por eso las pruebas de src/datos comparan con toEqual y nunca con toStrictEqual.
    expect(Object.hasOwn(fila?.valor as object, 'notas')).toBe(true)
  })
})
```

La prueba de los ids comprueba las tres vías: `crypto.randomUUID`, el respaldo con `crypto.getRandomValues` y el respaldo sin `crypto`.

Crea `src/datos/ids.test.ts` con este contenido:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nuevoId } from './ids'

/** Forma de un UUID versión 4 con variante 10xx: 8-4-4-4-12 en hexadecimal. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('nuevoId', () => {
  it('da un identificador distinto cada vez', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => nuevoId()))
    expect(ids.size).toBe(1000)
  })

  it('tiene la forma de un UUID versión 4', () => {
    expect(nuevoId()).toMatch(UUID_V4)
  })

  it('sigue dando un UUID cuando el navegador no trae randomUUID', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0xab)
        return bytes
      },
    })
    expect(nuevoId()).toBe('abababab-abab-4bab-abab-abababababab')

    vi.stubGlobal('crypto', undefined)
    expect(nuevoId()).toMatch(UUID_V4)
  })
})
```

- El identificador que sale de `getRandomValues` con todos los bytes a `0xab` es fijo y se puede escribir entero: la versión convierte el séptimo byte en `0x4b` (`0xab & 0x0f | 0x40`) y la variante deja el noveno en `0xab` (`0xab & 0x3f | 0x80`), así que el UUID es `abababab-abab-4bab-abab-abababababab`.

- [ ] **Paso 2: Ejecutar las dos pruebas y ver que fallan**

```bash
npx vitest run src/datos/baseDeDatos.test.ts src/datos/ids.test.ts
```

Fallo esperado: Vitest no encuentra `./baseDeDatos` ni `./ids`, que todavía no existen. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/baseDeDatos.test.ts (0 test)
 ❯ src/datos/ids.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/baseDeDatos.test.ts [ src/datos/baseDeDatos.test.ts ]
Error: Cannot find module './baseDeDatos' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/baseDeDatos.test.ts
 ❯ src/datos/baseDeDatos.test.ts:8:1
      7| import type { ResumenPartida } from '../dominio/modelo/resumen'
      8| import { type BaseDeDatos, VERSION_BASE } from './baseDeDatos'
       | ^
      9| import { baseDePrueba } from './pruebas/baseDePrueba'

 FAIL  src/datos/ids.test.ts [ src/datos/ids.test.ts ]
Error: Cannot find module './ids' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/ids.test.ts
 ❯ src/datos/ids.test.ts:2:1
      1| import { afterEach, describe, expect, it, vi } from 'vitest'
      2| import { nuevoId } from './ids'
       | ^

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed (2)
      Tests  no tests
   Start at  10:12:04
   Duration  548ms (worker 96%, environment 2%)
```

- [ ] **Paso 3: Implementar la base de datos**

Crea `src/datos/baseDeDatos.ts` con este contenido:

```ts
import { Dexie, type DexieOptions, type EntityTable, type Table } from 'dexie'
import type { OpcionCatalogo, RecursoCatalogo } from '../dominio/modelo/catalogos'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { ResumenPartida } from '../dominio/modelo/resumen'

/** Nombre de la base de IndexedDB de la app. */
export const NOMBRE_BASE = 'gestion-aldeas'

/** Versión de la estructura de la base (tablas e índices); no es versionFormato, que es la del contenido (§6.1). */
export const VERSION_BASE = 1

/** Fila de la tabla de ajustes de la app: clave y valor sueltos, fuera de toda partida. */
export interface Ajuste {
  clave: string
  valor: unknown
}

/**
 * Una sola base con cinco tablas: una transacción puede tocar a la vez partidas y catálogos (importar una copia y,
 * en la fase 9, reasignar una opción en todas las partidas). Las transacciones de IndexedDB no abarcan dos bases.
 */
export class BaseDeDatos extends Dexie {
  declare partidas: Table<DocumentoPartida, string>
  declare resumenes: EntityTable<ResumenPartida, 'id'>
  declare opcionesCatalogo: EntityTable<OpcionCatalogo, 'id'>
  declare recursosCatalogo: EntityTable<RecursoCatalogo, 'id'>
  declare ajustes: EntityTable<Ajuste, 'clave'>

  /** En la app: new BaseDeDatos(). En las pruebas: baseDePrueba(), que inyecta una IDBFactory nueva. */
  constructor(nombre: string = NOMBRE_BASE, opciones?: DexieOptions) {
    super(nombre, opciones)
    this.version(VERSION_BASE).stores({
      partidas: 'partida.id',
      resumenes: 'id, abiertaEl, actualizada',
      opcionesCatalogo: 'id, lista',
      recursosCatalogo: 'id',
      ajustes: 'clave',
    })
  }
}
```

- En `stores`, lo que va antes de la primera coma es la clave primaria y lo demás son índices. `partidas` no declara ninguno: siempre se lee por su id.
- `partidas` es `Table<DocumentoPartida, string>` y no `EntityTable` porque el documento no tiene `id` de primer nivel: su clave es la anidada `partida.id`.

Crea `src/datos/pruebas/baseDePrueba.ts` con este contenido:

```ts
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { BaseDeDatos, NOMBRE_BASE } from '../baseDeDatos'

/** Base vacía sobre una IDBFactory nueva: solo la usan las pruebas; el código de la app nunca la importa. */
export function baseDePrueba(nombre: string = NOMBRE_BASE): BaseDeDatos {
  return new BaseDeDatos(nombre, { indexedDB: new IDBFactory(), IDBKeyRange })
}
```

- Cada llamada crea una fábrica nueva, así que dos bases con el mismo nombre no se ven entre sí y ninguna prueba arrastra datos de otra.
- Este archivo es el único de `src/` que importa `fake-indexeddb`, que es una dependencia de desarrollo. `tsc -b` lo comprueba porque está dentro de `src`, y `vite build` no lo empaqueta porque el código de la app no lo importa.

- [ ] **Paso 4: Implementar `nuevoId`**

Crea `src/datos/ids.ts` con este contenido:

```ts
import type { Id } from '../dominio/modelo/comunes'

/**
 * Identificador nuevo de un registro (decisión 8). En la tablet es `crypto.randomUUID()`; si el navegador no lo
 * trae, se arma un UUID versión 4 con `crypto.getRandomValues` y, en último extremo, con `Math.random()`.
 * Vive en `src/datos` y no en el dominio porque `crypto` es una API del navegador.
 */
export function nuevoId(): Id {
  const cripto: Crypto | undefined = globalThis.crypto
  if (typeof cripto?.randomUUID === 'function') {
    return cripto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof cripto?.getRandomValues === 'function') {
    cripto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
```

- Los dos ajustes de bits son los de la norma: el byte 6 lleva la versión (`4`) y el byte 8, la variante (`10xx`). Los 32 dígitos hexadecimales se parten en los tramos de siempre, 8-4-4-4-12.
- `globalThis.crypto` se lee **dentro** de la función, no al cargar el módulo, para que la prueba pueda sustituirlo con `vi.stubGlobal`.

- [ ] **Paso 5: Pasar la prueba de humo al ayudante**

La tarea 1 dejó `src/datos/humo.test.ts` con una base Dexie declarada a mano dentro del propio archivo, porque `BaseDeDatos` todavía no existía. Ahora existe, y la prueba de humo pasa a usar la base de verdad con `baseDePrueba()`. Sigue teniendo **tres pruebas**, así que el recuento total no cambia por este archivo.

Reemplaza el contenido completo de `src/datos/humo.test.ts` por este:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type BaseDeDatos, NOMBRE_BASE } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('humo: Dexie sobre una IDBFactory falsa', () => {
  it('escribe y lee un registro', async () => {
    await db.ajustes.put({ clave: 'versionCatalogo', valor: 1 })
    expect(await db.ajustes.get('versionCatalogo')).toEqual({ clave: 'versionCatalogo', valor: 1 })
  })

  it('cada base de prueba parte vacía, sin estado compartido entre pruebas', async () => {
    await db.ajustes.put({ clave: 'versionCatalogo', valor: 1 })
    const otra = baseDePrueba()
    expect(await otra.ajustes.count()).toBe(0)
    otra.close()
  })

  it('no hay indexedDB global: el entorno de las pruebas es node y el dominio sigue sin navegador', () => {
    expect(typeof globalThis.indexedDB).toBe('undefined')
    expect(db.name).toBe(NOMBRE_BASE)
  })
})
```

- [ ] **Paso 6: Ejecutar las pruebas de `src/datos` y ver que pasan**

```bash
npx vitest run src/datos
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/datos/ids.test.ts (3 tests) 18ms
 ✓ src/datos/humo.test.ts (3 tests) 41ms
 ✓ src/datos/baseDeDatos.test.ts (5 tests) 63ms

 Test Files  3 passed (3)
      Tests  11 passed (11)
   Start at  10:14:37
   Duration  704ms (transform 41%, import 28%, worker 15%, tests 9%)
```

- [ ] **Paso 7: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que una tabla y su tipo se han separado (por ejemplo, declarar `EntityTable<DocumentoPartida, 'id'>` cuando el documento no tiene `id` de primer nivel); `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 375 pruebas en 28 archivos. Son **8 pruebas nuevas**: las 5 de `baseDeDatos.test.ts` y las 3 de `ids.test.ts`. `humo.test.ts` se ha reescrito entero pero sigue con 3, y `pureza.test.ts` no crece porque los tres archivos nuevos son de `src/datos` y no del dominio.

```text
 Test Files  28 passed (28)
      Tests  375 passed (375)
```

- [ ] **Paso 8: Commit**

```bash
git add src/datos/baseDeDatos.ts src/datos/baseDeDatos.test.ts src/datos/pruebas/baseDePrueba.ts src/datos/ids.ts src/datos/ids.test.ts src/datos/humo.test.ts
git commit -m "feat(datos): la base de Dexie con sus cinco tablas, el ayudante de las pruebas y los ids nuevos" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/datos/humo.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/baseDeDatos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/baseDeDatos.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/ids.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/ids.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/pruebas/baseDePrueba.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 9f31ba2] feat(datos): la base de Dexie con sus cinco tablas, el ayudante de las pruebas y los ids nuevos
 6 files changed, 302 insertions(+), 30 deletions(-)
 create mode 100644 src/datos/baseDeDatos.test.ts
 create mode 100644 src/datos/baseDeDatos.ts
 create mode 100644 src/datos/ids.test.ts
 create mode 100644 src/datos/ids.ts
 create mode 100644 src/datos/pruebas/baseDePrueba.ts
```

---

### Tarea 10 · Repositorio de partidas y ajustes

Todo lo que P0 necesita para existir: listar las partidas guardadas de la sesión más reciente a la más antigua, crear una, abrirla, guardarla, borrarla y saber cuál fue la última que se usó. Cada escritura toca dos tablas a la vez —el documento y su fila de resumen— y por eso va siempre dentro de una transacción. Y, de paso, los ajustes de la app: una tabla de clave y valor fuera de toda partida, que hoy guarda solo `versionCatalogo` (lo necesita la tarea 11) y en la fase 9 guardará los «Recientes» de los selectores.

**Reglas de la especificación que implementa:**

- **P0 lista las partidas con lo justo (§6.1, P0).** «Partidas guardadas (nombre, fecha en juego, dominios, última sesión), continuar, exportar, «Nueva partida» e «Importar copia»». Eso es exactamente `ResumenPartida` (tarea 6), y se lee de la tabla `resumenes` sin cargar ni un documento.
- **«Última sesión» y «última partida usada» (decisión 9).** «Cada partida guarda `abiertaEl`, que cambia al abrirla, no viaja en la copia y no cuenta como cambio; la última usada es la de `abiertaEl` más reciente. `actualizada` sigue siendo el último cambio del estado». De ahí las tres reglas que fija esta tarea: abrir toca `abiertaEl` y **no** `actualizada`; guardar toca `actualizada` y **no** `abiertaEl`; y no hay ningún ajuste `ultimaPartidaId`, porque la última usada se deduce del índice.
- **Eliminar partida (§6.1, «Editar partida»).** «Eliminar partida» (J2d), que vuelve a P0». Borra el documento y su resumen; si no existe, no pasa nada.
- **«Última copia exportada» (decisión 9).** `exportadaEl` vive en la fila de resumen, fuera del estado. Esta tarea no lo escribe (lo hará `exportarCopia`, tarea 14), pero **sí tiene que conservarlo** al volver a guardar la partida, o cada guardado borraría la fecha de la última copia.
- **Ajustes de la app (§6.6).** El catálogo guarda su versión «para que una actualización del catálogo inicial no las reponga» (§6.5, l. 1011): esa versión es un ajuste de la app, no de una partida.
- **Nada de esto valida (decisión 14).** El repositorio guarda lo que le dan; quien comprueba que un documento es válido es `validacion/` (tarea 13), y solo al importar una copia. Guardar la partida propia no revalida el estado en cada guardado.

Cómo quedan las tres marcas de tiempo, que es lo que más se confunde:

| Marca | Dónde vive | Quién la mueve |
|---|---|---|
| `partida.actualizada` | dentro del documento (viaja en la copia) | `guardarPartida`, con el `ahora` que recibe |
| `resumen.abiertaEl` | solo en la tabla `resumenes` | `crearPartida` y `abrirPartida` |
| `resumen.exportadaEl` | solo en la tabla `resumenes` | `exportarCopia` (tarea 14); aquí solo se conserva |

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/datos/repositorio.ts`, `src/datos/ajustes.ts`
- Prueba: `src/datos/repositorio.test.ts`, `src/datos/ajustes.test.ts`

- [ ] **Paso 1: Escribir la prueba del repositorio, que falla**

Crea `src/datos/repositorio.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dominio/dinero/monedas'
import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { VERSION_FORMATO } from '../dominio/modelo/partida'
import type { BaseDeDatos } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'
import {
  abrirPartida,
  borrarPartida,
  crearPartida,
  guardarPartida,
  leerPartida,
  listarPartidas,
  ultimaPartidaUsada,
} from './repositorio'

/** Instantes fijos, en orden, para que las pruebas no dependan del reloj. */
const CREADA: Instante = '2026-09-17T09:00:00.000Z'
const SESION_1: Instante = '2026-09-17T10:00:00.000Z'
const SESION_2: Instante = '2026-09-17T11:00:00.000Z'
const GUARDADO: Instante = '2026-09-17T12:00:00.000Z'
const EXPORTACION: Instante = '2026-09-17T13:00:00.000Z'

/**
 * Documento mínimo y completo: la cabecera de la partida, un personaje con su bolsa y las 32 colecciones
 * restantes vacías. Son las 34 claves de EsquemaEstadoPartida más `avances` (tarea 6).
 */
function documentoDePrueba(id: Id, nombre: string, personaje: string): DocumentoPartida {
  return {
    partida: {
      id,
      nombre,
      edad: 'tercera',
      equivalencias: EQUIVALENCIAS_POR_DEFECTO,
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 1, dia: 1 },
      fechaActual: { anio: 1640, mes: 1, dia: 1 },
      creada: CREADA,
      actualizada: CREADA,
      versionFormato: VERSION_FORMATO,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [{ id: 'dom.personaje', tipo: 'personaje', nombre: personaje }],
    cajas: [{ dominioId: 'dom.personaje', saldoInicial: { base: 4091800 } }],
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
    avances: [],
  }
}

/** La Sombra del Este, la partida del ejemplo de la especificación. */
function sombraDelEste(): DocumentoPartida {
  return documentoDePrueba('p.sombra-del-este', 'La Sombra del Este', 'Tharan')
}

/** Una segunda partida, para las pruebas de orden y de borrado. */
function senderosDelNorte(): DocumentoPartida {
  return documentoDePrueba('p.senderos-del-norte', 'Los Senderos del Norte', 'Elwen')
}

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('listar partidas', () => {
  it('en una base vacía no devuelve ninguna y no hay última usada', async () => {
    expect(await listarPartidas(db)).toEqual([])
    expect(await ultimaPartidaUsada(db)).toBeUndefined()
  })

  it('devuelve los resúmenes de la sesión más reciente a la más antigua', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await crearPartida(db, senderosDelNorte(), SESION_2)
    const partidas = await listarPartidas(db)
    expect(partidas.map((resumen) => resumen.nombre)).toEqual(['Los Senderos del Norte', 'La Sombra del Este'])
  })

  it('la última usada es la de abiertaEl más reciente, y abrir otra la cambia', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await crearPartida(db, senderosDelNorte(), SESION_2)
    expect((await ultimaPartidaUsada(db))?.id).toBe('p.senderos-del-norte')

    await abrirPartida(db, 'p.sombra-del-este', '2026-09-17T14:00:00.000Z')
    expect((await ultimaPartidaUsada(db))?.id).toBe('p.sombra-del-este')
  })
})

describe('crear una partida', () => {
  it('guarda el documento y su resumen y devuelve la fila de P0', async () => {
    const resumen = await crearPartida(db, sombraDelEste(), SESION_1)
    expect(resumen).toEqual({
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      fechaInicial: { anio: 1640, mes: 1, dia: 1 },
      fechaActual: { anio: 1640, mes: 1, dia: 1 },
      dominios: ['Tharan'],
      creada: CREADA,
      actualizada: CREADA,
      abiertaEl: SESION_1,
      exportadaEl: undefined,
      hayAvances: false,
    })
    expect(await db.partidas.count()).toBe(1)
    expect(await db.resumenes.count()).toBe(1)
  })

  it('con un id repetido lanza y no toca lo que ya estaba guardado', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const repetida = documentoDePrueba('p.sombra-del-este', 'Otra partida', 'Otro')
    await expect(crearPartida(db, repetida, SESION_2)).rejects.toThrow(
      'Ya hay una partida con el id «p.sombra-del-este»',
    )
    expect((await db.partidas.get('p.sombra-del-este'))?.partida.nombre).toBe('La Sombra del Este')
    expect((await db.resumenes.get('p.sombra-del-este'))?.abiertaEl).toBe(SESION_1)
    expect(await db.partidas.count()).toBe(1)
  })
})

describe('abrir y leer una partida', () => {
  it('abrir devuelve el documento y anota la sesión sin tocar actualizada', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const documento = await abrirPartida(db, 'p.sombra-del-este', SESION_2)
    expect(documento?.partida.nombre).toBe('La Sombra del Este')
    expect(documento?.partida.actualizada).toBe(CREADA)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.abiertaEl).toBe(SESION_2)
    expect(resumen?.actualizada).toBe(CREADA)
  })

  it('abrir una partida que no existe devuelve undefined y no crea nada', async () => {
    expect(await abrirPartida(db, 'p.no-existe', SESION_1)).toBeUndefined()
    expect(await db.resumenes.count()).toBe(0)
  })

  it('leer no anota la sesión', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const documento = await leerPartida(db, 'p.sombra-del-este')
    expect(documento?.partida.id).toBe('p.sombra-del-este')
    expect((await db.resumenes.get('p.sombra-del-este'))?.abiertaEl).toBe(SESION_1)
    expect(await leerPartida(db, 'p.no-existe')).toBeUndefined()
  })
})

describe('guardar una partida', () => {
  it('pone actualizada y no muta el documento que recibe', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    const documento = sombraDelEste()
    const guardado = await guardarPartida(db, documento, GUARDADO)
    expect(documento.partida.actualizada).toBe(CREADA)
    expect(guardado.partida.actualizada).toBe(GUARDADO)
    expect((await db.partidas.get('p.sombra-del-este'))?.partida.actualizada).toBe(GUARDADO)
  })

  it('refresca el resumen y conserva abiertaEl y exportadaEl', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await db.resumenes.update('p.sombra-del-este', { exportadaEl: EXPORTACION })
    const documento = sombraDelEste()
    const conAvance: DocumentoPartida = {
      ...documento,
      partida: { ...documento.partida, fechaActual: { anio: 1640, mes: 4, dia: 12 } },
    }
    await guardarPartida(db, conAvance, GUARDADO)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(resumen?.hayAvances).toBe(true)
    expect(resumen?.actualizada).toBe(GUARDADO)
    expect(resumen?.abiertaEl).toBe(SESION_1)
    expect(resumen?.exportadaEl).toBe(EXPORTACION)
  })
})

describe('borrar una partida', () => {
  it('quita el documento y su resumen y deja las demás', async () => {
    await crearPartida(db, sombraDelEste(), SESION_1)
    await crearPartida(db, senderosDelNorte(), SESION_2)
    await borrarPartida(db, 'p.sombra-del-este')
    expect(await db.partidas.count()).toBe(1)
    expect(await db.resumenes.count()).toBe(1)
    expect((await listarPartidas(db)).map((resumen) => resumen.id)).toEqual(['p.senderos-del-norte'])
  })

  it('borrar una partida que no existe no falla', async () => {
    await expect(borrarPartida(db, 'p.no-existe')).resolves.toBeUndefined()
  })
})
```

- El resumen se compara entero con `toEqual`, que trata igual una clave ausente y una clave con valor `undefined`: así la prueba vale tanto si `resumenDePartida` (tarea 6) escribe `exportadaEl: undefined` como si no escribe la clave.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/repositorio.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./repositorio`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/repositorio.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/repositorio.test.ts [ src/datos/repositorio.test.ts ]
Error: Cannot find module './repositorio' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/repositorio.test.ts
 ❯ src/datos/repositorio.test.ts:8:1
      7| import { baseDePrueba } from './pruebas/baseDePrueba'
      8| import {
       | ^
      9|   abrirPartida,
     10|   borrarPartida,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  10:21:16
   Duration  531ms (worker 95%, environment 3%)
```

- [ ] **Paso 3: Implementar `repositorio.ts`**

Crea `src/datos/repositorio.ts` con este contenido:

```ts
import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import { resumenDePartida, type ResumenPartida } from '../dominio/modelo/resumen'
import type { BaseDeDatos } from './baseDeDatos'

/** Dexie lanza un error con nombre ConstraintError cuando `add` choca con una clave que ya existe. */
function esClaveRepetida(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConstraintError'
}

/** Resúmenes de P0, de la sesión más reciente a la más antigua (§6.1, «última sesión»). */
export async function listarPartidas(db: BaseDeDatos): Promise<ResumenPartida[]> {
  return db.resumenes.orderBy('abiertaEl').reverse().toArray()
}

/** La última partida usada, la de abiertaEl más reciente, o undefined si no hay ninguna (§5, decisión 9). */
export async function ultimaPartidaUsada(db: BaseDeDatos): Promise<ResumenPartida | undefined> {
  return db.resumenes.orderBy('abiertaEl').last()
}

/** Guarda un documento nuevo y su resumen en una transacción; lanza si ya hay una partida con ese id (§6.1). */
export async function crearPartida(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  ahora: Instante,
): Promise<ResumenPartida> {
  const resumen = resumenDePartida(documento, { abiertaEl: ahora })
  try {
    await db.transaction('rw', db.partidas, db.resumenes, async () => {
      await db.partidas.add(documento)
      await db.resumenes.add(resumen)
    })
  } catch (error) {
    if (esClaveRepetida(error)) {
      throw new Error(`Ya hay una partida con el id «${documento.partida.id}»`)
    }
    throw error
  }
  return resumen
}

/** Lee el documento y anota la sesión (abiertaEl = ahora, que no toca el estado); undefined si no existe (decisión 9). */
export async function abrirPartida(
  db: BaseDeDatos,
  id: Id,
  ahora: Instante,
): Promise<DocumentoPartida | undefined> {
  return db.transaction('rw', db.partidas, db.resumenes, async () => {
    const documento = await db.partidas.get(id)
    if (documento === undefined) {
      return undefined
    }
    await db.resumenes.update(id, { abiertaEl: ahora })
    return documento
  })
}

/** Lee el documento sin anotar la sesión, para exportar o comprobar; undefined si no existe. */
export async function leerPartida(db: BaseDeDatos, id: Id): Promise<DocumentoPartida | undefined> {
  return db.partidas.get(id)
}

/** Reemplaza el documento y su resumen con actualizada = ahora, y devuelve el documento tal como quedó guardado. */
export async function guardarPartida(
  db: BaseDeDatos,
  documento: DocumentoPartida,
  ahora: Instante,
): Promise<DocumentoPartida> {
  const guardado: DocumentoPartida = { ...documento, partida: { ...documento.partida, actualizada: ahora } }
  await db.transaction('rw', db.partidas, db.resumenes, async () => {
    const anterior = await db.resumenes.get(guardado.partida.id)
    await db.partidas.put(guardado)
    await db.resumenes.put(
      resumenDePartida(guardado, { abiertaEl: anterior?.abiertaEl ?? ahora, exportadaEl: anterior?.exportadaEl }),
    )
  })
  return guardado
}

/** Borra el documento y su resumen en una transacción; no falla si no existe (§6.1, «Eliminar partida»). */
export async function borrarPartida(db: BaseDeDatos, id: Id): Promise<void> {
  await db.transaction('rw', db.partidas, db.resumenes, async () => {
    await db.partidas.delete(id)
    await db.resumenes.delete(id)
  })
}
```

- `guardarPartida` **no muta** su argumento: arma un documento nuevo con `partida.actualizada` cambiada y guarda ese.
- Si la partida se guarda sin haber pasado por `crearPartida` (no hay fila de resumen anterior), `abiertaEl` toma el `ahora` del guardado. Es el caso de la importación (tarea 17), que escribe su propio resumen.
- Dentro de las transacciones solo hay operaciones de IndexedDB: nada que pueda cerrarlas antes de tiempo.

- [ ] **Paso 4: Ejecutar la prueba del repositorio y ver que pasa**

```bash
npx vitest run src/datos/repositorio.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/datos/repositorio.test.ts (12 tests) 142ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  10:23:02
   Duration  812ms (transform 39%, import 26%, worker 14%, tests 16%)
```

- [ ] **Paso 5: Escribir la prueba de los ajustes, que falla**

Crea `src/datos/ajustes.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { guardarAjuste, leerAjuste, leerAjustes } from './ajustes'
import type { BaseDeDatos } from './baseDeDatos'
import { baseDePrueba } from './pruebas/baseDePrueba'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('leerAjuste y guardarAjuste', () => {
  it('en una base nueva no hay ningún ajuste guardado', async () => {
    expect(await leerAjuste(db, 'versionCatalogo')).toBeUndefined()
    expect(await leerAjustes(db)).toEqual({})
  })

  it('guarda un valor y lo devuelve tal cual', async () => {
    await guardarAjuste(db, 'versionCatalogo', 1)
    expect(await leerAjuste(db, 'versionCatalogo')).toBe(1)
  })

  it('guardar dos veces la misma clave reemplaza el valor y no deja dos filas', async () => {
    await guardarAjuste(db, 'versionCatalogo', 1)
    await guardarAjuste(db, 'versionCatalogo', 2)
    expect(await leerAjuste(db, 'versionCatalogo')).toBe(2)
    expect(await db.ajustes.count()).toBe(1)
  })
})

describe('leerAjustes', () => {
  it('devuelve los ajustes guardados', async () => {
    await guardarAjuste(db, 'versionCatalogo', 3)
    expect(await leerAjustes(db)).toEqual({ versionCatalogo: 3 })
  })

  it('no se rompe con una clave que todavía no conoce ni con un valor de otro tipo', async () => {
    // Los «Recientes» de los selectores llegan en la fase 9; hoy la tabla puede traerlos de una versión futura.
    await db.ajustes.put({ clave: 'recientesCategorias', valor: ['cat.alojamiento'] })
    await db.ajustes.put({ clave: 'versionCatalogo', valor: 'uno' })
    expect(await leerAjustes(db)).toEqual({})
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba de los ajustes y ver que falla**

```bash
npx vitest run src/datos/ajustes.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./ajustes`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/ajustes.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/ajustes.test.ts [ src/datos/ajustes.test.ts ]
Error: Cannot find module './ajustes' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/ajustes.test.ts
 ❯ src/datos/ajustes.test.ts:2:1
      1| import { afterEach, beforeEach, describe, expect, it } from 'vitest'
      2| import { guardarAjuste, leerAjuste, leerAjustes } from './ajustes'
       | ^
      3| import type { BaseDeDatos } from './baseDeDatos'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  10:25:40
   Duration  505ms (worker 96%, environment 2%)
```

- [ ] **Paso 7: Implementar `ajustes.ts`**

Crea `src/datos/ajustes.ts` con este contenido:

```ts
import type { BaseDeDatos } from './baseDeDatos'

/** Ajustes de la app, fuera de toda partida; la fase 9 añadirá los «Recientes» de los selectores (§6.5). */
export interface AjustesApp {
  versionCatalogo: number
}

export type ClaveAjuste = keyof AjustesApp

/** Valor de un ajuste, o undefined si nunca se ha guardado. */
export async function leerAjuste<C extends ClaveAjuste>(
  db: BaseDeDatos,
  clave: C,
): Promise<AjustesApp[C] | undefined> {
  const fila = await db.ajustes.get(clave)
  return fila === undefined ? undefined : (fila.valor as AjustesApp[C])
}

/** Guarda (o reemplaza) el valor de un ajuste. */
export async function guardarAjuste<C extends ClaveAjuste>(
  db: BaseDeDatos,
  clave: C,
  valor: AjustesApp[C],
): Promise<void> {
  await db.ajustes.put({ clave, valor })
}

/** Todos los ajustes guardados, para la pantalla de ajustes (P6). */
export async function leerAjustes(db: BaseDeDatos): Promise<Partial<AjustesApp>> {
  const ajustes: Partial<AjustesApp> = {}
  for (const fila of await db.ajustes.toArray()) {
    if (fila.clave === 'versionCatalogo' && typeof fila.valor === 'number') {
      ajustes.versionCatalogo = fila.valor
    }
  }
  return ajustes
}
```

- La tabla guarda `valor: unknown`, así que el tipo se recupera en la firma: estas tres funciones son la única puerta a la tabla `ajustes`, y nadie más escribe en ella.
- `leerAjustes` comprueba clave y tipo fila a fila, de modo que una clave que llegue de una versión futura de la app (los «Recientes» de la fase 9) no se cuela con un tipo que no le toca. Cuando la fase 9 añada claves, se añade su comprobación aquí.
- No hay `ultimaPartidaId`: la última partida usada es la del `abiertaEl` más reciente (decisión 9).

- [ ] **Paso 8: Ejecutar la prueba de los ajustes y ver que pasa**

```bash
npx vitest run src/datos/ajustes.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/datos/ajustes.test.ts (5 tests) 47ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  10:27:11
   Duration  672ms (transform 36%, import 27%, worker 16%, tests 8%)
```

- [ ] **Paso 9: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que `resumenDePartida` y la tabla `resumenes` se han separado, o que un ajuste se guarda con un tipo que no es el suyo; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 392 pruebas en 30 archivos. Son **17 pruebas nuevas**: las 12 de `repositorio.test.ts` y las 5 de `ajustes.test.ts`.

```text
 Test Files  30 passed (30)
      Tests  392 passed (392)
```

- [ ] **Paso 10: Commit**

```bash
git add src/datos/repositorio.ts src/datos/repositorio.test.ts src/datos/ajustes.ts src/datos/ajustes.test.ts
git commit -m "feat(datos): listar, crear, abrir, guardar y borrar partidas, y los ajustes de la app" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/datos/ajustes.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/ajustes.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/repositorio.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/repositorio.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 51c7d8e] feat(datos): listar, crear, abrir, guardar y borrar partidas, y los ajustes de la app
 4 files changed, 393 insertions(+)
 create mode 100644 src/datos/ajustes.test.ts
 create mode 100644 src/datos/ajustes.ts
 create mode 100644 src/datos/repositorio.test.ts
 create mode 100644 src/datos/repositorio.ts
```

---

### Tarea 11 · Siembra y lectura del catálogo

La tarea 8 dejó escritas las 145 opciones y los 21 recursos de fábrica como una constante pura. Esta los mete en la base y los saca de ella. Sembrar no es «copiar la constante una vez al crear la base»: la app llama a `sembrarCatalogo` **en cada arranque**, porque una versión nueva de la app puede traer opciones nuevas, y tiene que añadirlas sin pisar nada de lo que el jugador haya cambiado: si renombró «Alojamiento» a «Hospedaje», se queda «Hospedaje»; si eliminó «Montura», sigue eliminada y no reaparece. Lo único que la siembra refresca de una opción que ya existe es su candado (`protegida` y `protegido`), porque eso no es del jugador: lo decide la app.

**Reglas de la especificación que implementa:**

- **Los catálogos son de la app (§6.5, «Ámbito de las listas»).** «Los catálogos (categorías, oficios, tipos de edificio, de unidad, de defensa y de animal, y recursos) son de la app y se comparten entre partidas». Por eso viven en sus dos tablas, fuera de las partidas, y se siembran una vez para todas.
- **Lo eliminado no vuelve (§6.6, «Opciones de la app»).** «Tienen id fijo («cat.alojamiento», «oficio.cantero»). Al eliminarlas quedan marcadas como borradas, **para que una actualización del catálogo inicial no las reponga**, y no se muestran en selectores ni en P7». De ahí las dos reglas de la siembra: se inserta **por id** solo lo que falta, y `borrada` no se toca nunca.
- **Renombrar es del jugador, el candado es de la app (§6.6, patrón 5).** «Las que llevan candado las pone la app: se renombran, pero no se eliminan». El nombre, el grupo, el plural y las unidades son del jugador y la siembra no los toca; `protegida` y `protegido` los vuelve a poner como los trae la constante de fábrica.
- **Los selectores enseñan lo no borrado, ordenado por nombre (§6.5).** `leerOpciones` y `leerRecursos` son lo que alimentan los desplegables y P7, así que filtran lo borrado y ordenan por nombre. El catálogo entero, con lo borrado incluido, solo lo necesitan la fusión al importar (tarea 16) y la resolución de ids: eso es `leerCatalogo`.
- **La versión del catálogo se guarda (§6.6).** `versionCatalogo` va en la tabla `ajustes` (tarea 10), no dentro de ninguna partida.
- **La importación escribe catálogo y partida en una sola transacción (decisión 14).** Por eso `escribirCatalogo` existe aparte: la tarea 17 la llamará **dentro** de su propia transacción. Dexie admite transacciones anidadas si el alcance de la de dentro cabe en la de fuera y el modo es el mismo, que es justo el caso.

El orden de los selectores se decide con `normalizarNombre` (tarea 7), no con `localeCompare`: así «Ávila» cae junto a «avena» y el orden no depende de la configuración regional de la tablet ni de la versión del navegador.

Con estos números, la app escribirá en su registro interno la línea «Catálogo de la app: 145 opciones y 21 recursos; se han añadido 0 opciones y 0 recursos.» Eso es de la fase 6: aquí solo se devuelven las cifras.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/datos/catalogos.ts`
- Prueba: `src/datos/catalogos.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

Crea `src/datos/catalogos.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OPCIONES_INICIALES, RECURSOS_INICIALES, VERSION_CATALOGO } from '../dominio/catalogo/inicial'
import type { OpcionCatalogo, RecursoCatalogo } from '../dominio/modelo/catalogos'
import { leerAjuste } from './ajustes'
import type { BaseDeDatos } from './baseDeDatos'
import { escribirCatalogo, leerCatalogo, leerOpciones, leerRecursos, sembrarCatalogo } from './catalogos'
import { baseDePrueba } from './pruebas/baseDePrueba'

/** Una categoría del jugador, como la «Posadas del camino» que J2e crea en el ejemplo (§6.6, patrón 2). */
const CATEGORIA_PROPIA: OpcionCatalogo = {
  id: 'cat.propia-posadas',
  nombre: 'Posadas del camino',
  lista: 'categorias',
  grupo: 'tuyas',
  propia: true,
  borrada: false,
}

/** Un recurso del jugador, para comprobar que escribirCatalogo también da de alta recursos. */
const RECURSO_PROPIO: RecursoCatalogo = {
  id: 'recurso.propio-especias',
  nombre: 'Especias',
  unidadSingular: 'saco',
  unidadPlural: 'sacos',
  propia: true,
  borrada: false,
}

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

describe('sembrarCatalogo', () => {
  it('en una base vacía deja las 145 opciones y los 21 recursos de fábrica', async () => {
    const resumen = await sembrarCatalogo(db)
    expect(resumen).toEqual({ opcionesAnadidas: 145, recursosAnadidos: 21, versionCatalogo: VERSION_CATALOGO })
    expect(await db.opcionesCatalogo.count()).toBe(OPCIONES_INICIALES.length)
    expect(await db.recursosCatalogo.count()).toBe(RECURSOS_INICIALES.length)
  })

  it('sembrar dos veces no duplica nada ni añade nada la segunda vez', async () => {
    await sembrarCatalogo(db)
    const resumen = await sembrarCatalogo(db)
    expect(resumen).toEqual({ opcionesAnadidas: 0, recursosAnadidos: 0, versionCatalogo: VERSION_CATALOGO })
    expect(await db.opcionesCatalogo.count()).toBe(145)
    expect(await db.recursosCatalogo.count()).toBe(21)
  })

  it('no pisa lo que el jugador cambió: un renombrado, un borrado y unas unidades siguen igual', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.alojamiento')
      .modify((opcion) => {
        opcion.nombre = 'Hospedaje'
      })
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.montura')
      .modify((opcion) => {
        opcion.borrada = true
      })
    await db.recursosCatalogo.update('recurso.sal', { unidadSingular: 'fardo', unidadPlural: 'fardos' })

    const resumen = await sembrarCatalogo(db)
    expect(resumen.opcionesAnadidas).toBe(0)
    expect((await db.opcionesCatalogo.get('cat.alojamiento'))?.nombre).toBe('Hospedaje')
    expect((await db.opcionesCatalogo.get('cat.montura'))?.borrada).toBe(true)
    expect((await db.recursosCatalogo.get('recurso.sal'))?.unidadPlural).toBe('fardos')
  })

  it('añade lo que falta del catálogo de fábrica, que es lo que hace una versión nueva de la app', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo.delete('cat.montura')
    await db.recursosCatalogo.delete('recurso.sal')

    const resumen = await sembrarCatalogo(db)
    expect(resumen).toEqual({ opcionesAnadidas: 1, recursosAnadidos: 1, versionCatalogo: VERSION_CATALOGO })
    expect((await db.opcionesCatalogo.get('cat.montura'))?.nombre).toBe('Montura')
    expect((await db.recursosCatalogo.get('recurso.sal'))?.nombre).toBe('Sal')
    expect(await db.opcionesCatalogo.count()).toBe(145)
  })

  it('devuelve el candado a su sitio sin tocar el nombre', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.salarios')
      .modify((opcion) => {
        opcion.nombre = 'Pagas'
        opcion.protegida = false
      })
    await db.recursosCatalogo.update('recurso.viveres', { nombre: 'Provisiones', protegido: undefined })

    await sembrarCatalogo(db)
    const salarios = await db.opcionesCatalogo.get('cat.salarios')
    expect(salarios?.nombre).toBe('Pagas')
    expect(salarios?.protegida).toBe(true)
    const viveres = await db.recursosCatalogo.get('recurso.viveres')
    expect(viveres?.nombre).toBe('Provisiones')
    expect(viveres?.protegido).toBe('viveres')
  })

  it('guarda la versión del catálogo en los ajustes de la app', async () => {
    expect(await leerAjuste(db, 'versionCatalogo')).toBeUndefined()
    await sembrarCatalogo(db)
    expect(await leerAjuste(db, 'versionCatalogo')).toBe(VERSION_CATALOGO)
  })
})

describe('leer el catálogo', () => {
  it('leerOpciones da las de su lista, sin las borradas y por nombre', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.alojamiento')
      .modify((opcion) => {
        opcion.borrada = true
      })
    const categorias = await leerOpciones(db, 'categorias')
    expect(categorias).toHaveLength(26)
    expect(categorias.every((opcion) => opcion.lista === 'categorias')).toBe(true)
    expect(categorias.slice(0, 3).map((opcion) => opcion.nombre)).toEqual([
      'Ajustes',
      'Aranceles',
      'Armas y armaduras',
    ])
    expect(categorias.at(-1)?.nombre).toBe('Víveres del almacén')
    expect(await leerOpciones(db, 'tiposDefensa')).toHaveLength(6)
  })

  it('leerRecursos da los no borrados, por nombre y sin depender de las tildes', async () => {
    await sembrarCatalogo(db)
    await db.recursosCatalogo.update('recurso.armas', { borrada: true })
    const recursos = await leerRecursos(db)
    expect(recursos).toHaveLength(20)
    expect(recursos.slice(0, 3).map((recurso) => recurso.nombre)).toEqual(['Arcilla', 'Carbón', 'Carne'])
    expect(recursos.at(-1)?.nombre).toBe('Víveres')
  })

  it('leerCatalogo lo devuelve todo, también lo borrado y lo del jugador', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.montura')
      .modify((opcion) => {
        opcion.borrada = true
      })
    await db.opcionesCatalogo.add(CATEGORIA_PROPIA)

    const catalogo = await leerCatalogo(db)
    expect(catalogo.opciones).toHaveLength(146)
    expect(catalogo.recursos).toHaveLength(21)
    expect(catalogo.opciones.some((opcion) => opcion.id === 'cat.montura' && opcion.borrada)).toBe(true)
    expect(catalogo.opciones.some((opcion) => opcion.id === 'cat.propia-posadas' && opcion.propia)).toBe(true)
  })
})

describe('escribirCatalogo', () => {
  it('da de alta lo nuevo y reactiva lo borrado', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.comercio')
      .modify((opcion) => {
        opcion.borrada = true
      })
    await db.recursosCatalogo.update('recurso.lana', { borrada: true })

    await escribirCatalogo(db, {
      opcionesNuevas: [CATEGORIA_PROPIA],
      recursosNuevos: [RECURSO_PROPIO],
      opcionesReactivadas: ['cat.comercio'],
      recursosReactivados: ['recurso.lana'],
    })

    expect(await db.opcionesCatalogo.count()).toBe(146)
    expect(await db.recursosCatalogo.count()).toBe(22)
    expect((await db.opcionesCatalogo.get('cat.propia-posadas'))?.nombre).toBe('Posadas del camino')
    expect((await db.recursosCatalogo.get('recurso.propio-especias'))?.nombre).toBe('Especias')
    expect((await db.opcionesCatalogo.get('cat.comercio'))?.borrada).toBe(false)
    expect((await db.recursosCatalogo.get('recurso.lana'))?.borrada).toBe(false)
  })
})
```

- Las opciones se cambian con `.where('id').equals(…).modify(callback)` y no con `update({ … })` porque `OpcionCatalogo` es una unión discriminada por `lista`: con el callback, TypeScript sabe que `nombre`, `borrada` y `protegida` existen en las seis variantes. Los recursos no son unión, así que `update` vale.
- `update('recurso.viveres', { protegido: undefined })` **borra** la propiedad: es como Dexie simula una fila vieja, guardada por una versión de la app que todavía no protegía los víveres.

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/catalogos.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./catalogos`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/catalogos.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/catalogos.test.ts [ src/datos/catalogos.test.ts ]
Error: Cannot find module './catalogos' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/catalogos.test.ts
 ❯ src/datos/catalogos.test.ts:6:1
      5| import type { BaseDeDatos } from './baseDeDatos'
      6| import { escribirCatalogo, leerCatalogo, leerOpciones, leerRecursos, sembrarCatalogo } from './catalogos'
       | ^
      7| import { baseDePrueba } from './pruebas/baseDePrueba'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  10:31:48
   Duration  522ms (worker 96%, environment 2%)
```

- [ ] **Paso 3: Implementar `catalogos.ts`**

Crea `src/datos/catalogos.ts` con este contenido:

```ts
import { OPCIONES_INICIALES, RECURSOS_INICIALES, VERSION_CATALOGO } from '../dominio/catalogo/inicial'
import type {
  CambiosCatalogo,
  CatalogoApp,
  ListaCatalogo,
  OpcionCatalogo,
  RecursoCatalogo,
} from '../dominio/modelo/catalogos'
import type { Id } from '../dominio/modelo/comunes'
import { normalizarNombre } from '../dominio/texto/normalizar'
import { guardarAjuste } from './ajustes'
import type { BaseDeDatos } from './baseDeDatos'

/** Qué añadió la siembra; la app la llama en cada arranque, no solo al crear la base (§6.6). */
export interface ResumenSiembra {
  opcionesAnadidas: number
  recursosAnadidos: number
  versionCatalogo: number
}

/** Orden de los selectores: por el nombre normalizado, que no depende de la configuración regional (§6.6). */
function porNombre(a: { nombre: string }, b: { nombre: string }): number {
  const nombreA = normalizarNombre(a.nombre)
  const nombreB = normalizarNombre(b.nombre)
  if (nombreA < nombreB) {
    return -1
  }
  if (nombreA > nombreB) {
    return 1
  }
  return 0
}

/**
 * Inserta por id lo que falte del catálogo de fábrica y refresca protegida/protegido; nunca toca nombre, grupo,
 * plural, unidades ni borrada, para que un renombrado o un borrado del jugador sobrevivan (§6.6).
 */
export async function sembrarCatalogo(db: BaseDeDatos): Promise<ResumenSiembra> {
  return db.transaction('rw', db.opcionesCatalogo, db.recursosCatalogo, db.ajustes, async () => {
    const opcionesGuardadas = await db.opcionesCatalogo.bulkGet(OPCIONES_INICIALES.map((opcion) => opcion.id))
    const opcionesNuevas = OPCIONES_INICIALES.filter((_, i) => opcionesGuardadas[i] === undefined)
    const idsDeOpciones = OPCIONES_INICIALES.filter((_, i) => opcionesGuardadas[i] !== undefined).map(
      (opcion) => opcion.id,
    )
    if (opcionesNuevas.length > 0) {
      await db.opcionesCatalogo.bulkAdd(opcionesNuevas)
    }
    if (idsDeOpciones.length > 0) {
      const protegidaDeFabrica = new Map<Id, boolean>(
        OPCIONES_INICIALES.map((opcion) => [opcion.id, opcion.protegida === true]),
      )
      await db.opcionesCatalogo
        .where('id')
        .anyOf(idsDeOpciones)
        .modify((opcion) => {
          opcion.protegida = protegidaDeFabrica.get(opcion.id) === true
        })
    }

    const recursosGuardados = await db.recursosCatalogo.bulkGet(RECURSOS_INICIALES.map((recurso) => recurso.id))
    const recursosNuevos = RECURSOS_INICIALES.filter((_, i) => recursosGuardados[i] === undefined)
    const idsDeRecursos = RECURSOS_INICIALES.filter((_, i) => recursosGuardados[i] !== undefined).map(
      (recurso) => recurso.id,
    )
    if (recursosNuevos.length > 0) {
      await db.recursosCatalogo.bulkAdd(recursosNuevos)
    }
    if (idsDeRecursos.length > 0) {
      const protegidoDeFabrica = new Map<Id, RecursoCatalogo['protegido']>(
        RECURSOS_INICIALES.map((recurso) => [recurso.id, recurso.protegido]),
      )
      await db.recursosCatalogo
        .where('id')
        .anyOf(idsDeRecursos)
        .modify((recurso) => {
          recurso.protegido = protegidoDeFabrica.get(recurso.id)
        })
    }

    await guardarAjuste(db, 'versionCatalogo', VERSION_CATALOGO)
    return {
      opcionesAnadidas: opcionesNuevas.length,
      recursosAnadidos: recursosNuevos.length,
      versionCatalogo: VERSION_CATALOGO,
    }
  })
}

/** Las opciones no borradas de una lista, ordenadas por nombre: lo que ven los selectores y P7 (§6.5). */
export async function leerOpciones(db: BaseDeDatos, lista: ListaCatalogo): Promise<OpcionCatalogo[]> {
  const opciones = await db.opcionesCatalogo.where('lista').equals(lista).toArray()
  return opciones.filter((opcion) => !opcion.borrada).sort(porNombre)
}

/** Los recursos no borrados, ordenados por nombre (§6.5 n.º 18). */
export async function leerRecursos(db: BaseDeDatos): Promise<RecursoCatalogo[]> {
  const recursos = await db.recursosCatalogo.toArray()
  return recursos.filter((recurso) => !recurso.borrada).sort(porNombre)
}

/** El catálogo entero, también lo borrado: lo que necesitan la fusión al importar y la resolución de ids. */
export async function leerCatalogo(db: BaseDeDatos): Promise<CatalogoApp> {
  const opciones = await db.opcionesCatalogo.toArray()
  const recursos = await db.recursosCatalogo.toArray()
  return { opciones, recursos }
}

/** Escribe altas y reactivaciones del catálogo; la usa la importación dentro de su transacción (decisión 7). */
export async function escribirCatalogo(db: BaseDeDatos, cambios: CambiosCatalogo): Promise<void> {
  await db.transaction('rw', db.opcionesCatalogo, db.recursosCatalogo, async () => {
    if (cambios.opcionesNuevas.length > 0) {
      await db.opcionesCatalogo.bulkPut(cambios.opcionesNuevas)
    }
    if (cambios.recursosNuevos.length > 0) {
      await db.recursosCatalogo.bulkPut(cambios.recursosNuevos)
    }
    if (cambios.opcionesReactivadas.length > 0) {
      await db.opcionesCatalogo
        .where('id')
        .anyOf(cambios.opcionesReactivadas)
        .modify((opcion) => {
          opcion.borrada = false
        })
    }
    if (cambios.recursosReactivados.length > 0) {
      await db.recursosCatalogo
        .where('id')
        .anyOf(cambios.recursosReactivados)
        .modify((recurso) => {
          recurso.borrada = false
        })
    }
  })
}
```

- `bulkGet` devuelve un hueco `undefined` por cada id que no está: con eso se sabe de una vez qué falta y qué hay, sin 166 lecturas sueltas.
- El refresco del candado se hace con `modify` y un callback, no con un objeto de cambios, porque `OpcionCatalogo` es una unión discriminada y solo el callback deja tocar un campo común sin pelearse con los tipos.
- `escribirCatalogo` abre su propia transacción, pero si la importación (tarea 17) ya está dentro de una que incluye esas dos tablas, Dexie la anida en la de fuera y todo se confirma o se deshace junto.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/catalogos.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/datos/catalogos.test.ts (10 tests) 196ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  10:34:09
   Duration  845ms (transform 37%, import 25%, worker 13%, tests 19%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que una opción de fábrica no encaje con lo que espera la tabla, o que el catálogo que devuelve `leerCatalogo` deje de ser un `CatalogoApp`; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 402 pruebas en 31 archivos. Son **10 pruebas nuevas**, todas de `catalogos.test.ts`.

```text
 Test Files  31 passed (31)
      Tests  402 passed (402)
```

- [ ] **Paso 6: Commit**

```bash
git add src/datos/catalogos.ts src/datos/catalogos.test.ts
git commit -m "feat(datos): sembrar el catálogo de fábrica sin pisar lo del jugador, y leerlo" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/datos/catalogos.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/catalogos.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas b2a6f40] feat(datos): sembrar el catálogo de fábrica sin pisar lo del jugador, y leerlo
 2 files changed, 324 insertions(+)
 create mode 100644 src/datos/catalogos.test.ts
 create mode 100644 src/datos/catalogos.ts
```

---

### Tarea 12 · Saldo y fórmulas de la fase

La hoja de ruta de la fase 2 pone una sola fórmula, el **saldo de una caja**: «saldo inicial + sus movimientos no programados». Esta tarea la escribe, junto con las otras dos que el entregable necesita: el saldo de todos los dominios de una partida (lo que pintan P0 y la cabecera de P2) y la suma de la bolsa inicial de varias filas de monedas que teclea P1b. Las tres son puras y viven en `src/dominio/dinero/saldo.ts`, al lado del resto del dinero de la fase 1. El módulo no calcula nada de existencias ni de deudas: eso es del motor, en las fases 3 a 5.

Depende de la tarea 6, que es la que deja escritos `Caja` (`modelo/dominios.ts`), `Movimiento` (`modelo/movimientos.ts`) y `EstadoPartida` (`modelo/documento.ts`). De la fase 1 reutiliza `aBase` (`dinero/importe.ts`), `Equivalencias` y `Moneda` (`dinero/monedas.ts`) y, solo en la prueba, `formatearOro` (`dinero/formato.ts`). Todos los tipos del modelo se importan con `import type`, así que en tiempo de ejecución `saldo.ts` no importa nada de `modelo/` y no hay riesgo de ciclo con `modelo/comunes.ts`, que sí importa valores de `dinero/`.

**Reglas de la especificación que implementa:**

- **Saldo de una bolsa o caja (§7).** «**Saldo** de una bolsa o caja = saldo inicial + suma de sus movimientos no programados. Editar o eliminar un movimiento, o el saldo inicial, lo recalcula. Una acción manual puede dejarlo en negativo con confirmación (6.4).» El saldo **no se guarda**: `Caja` solo tiene `dominioId` y `saldoInicial`, y el saldo se calcula cada vez (`contrato-modelo.md` §2.2).
- **Programados (§7).** «Un movimiento con fecha futura queda programado. No cuenta en el saldo hasta que el avance llega a su fecha». El que decide es el campo `programado`, no la fecha: un movimiento con fecha pasada que el avance todavía no ha aplicado sigue con `programado: true` y sigue sin contar, y la vuelta ya pasada de una caravana se aplica en el siguiente avance. Por eso `saldoDeCaja` mira `m.programado === false` y **no** compara fechas (`contrato-datos.md` §2.5).
- **El signo vive en el importe (§3 y decisión 18).** `Movimiento.importe.base` es el único importe con signo del modelo: un gasto es `≤ 0` y un ingreso es `≥ 0` (lo comprueba `EsquemaMovimiento`). Así que el saldo **suma** `importe.base` sin mirar `tipo`. Las dos caras de una transferencia son dos movimientos, uno negativo en el dominio del que sale y otro positivo en el que entra, cada uno con su `dominioId`: sumando por dominio, cada lado cae donde le toca.
- **Bolsa inicial de P1b (§3, P1b).** «Bolsa inicial del personaje, que admite varias filas de monedas que se suman (38 mo + 25 mp + 40 mb + 18 mc = 40,918 mo).» Cada fila se pasa a hierro con `aBase` (fase 1), que redondea al mh con las mitades hacia arriba, y se suman los enteros. Con las equivalencias por defecto: 3.800.000 + 250.000 + 40.000 + 1.800 = **4.091.800 mh**, que `formatearOro` escribe «40,918 mo».
- **Lo introducido queda vacío en la bolsa de varias filas (§3).** «Es **opcional**: queda vacío en los importes calculados o agrupados … y en la bolsa inicial de varias filas.» Por eso `sumarBolsaInicial` devuelve un `number` en mh y no un `Importe`: quien la llama arma el `Importe` con `introducido` solo si el jugador tecleó una sola fila.
- **El dominio es puro (plan de la fase 1).** `src/dominio/dinero/saldo.ts` no importa Dexie, ni React, ni APIs del navegador. La prueba de pureza de la tarea 1 recorre también este módulo nuevo.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/dinero/saldo.ts`
- Prueba: `src/dominio/dinero/saldo.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba arma sus datos a mano: la partida de ejemplo no existe hasta la tarea 18. `estadoVacio()` construye un `EstadoPartida` con las 34 claves (la partida y las 33 colecciones) para que `saldosPorDominio` reciba un estado de verdad; cada prueba solo rellena `cajas` y `movimientos`.

Qué comprueba cada bloque:
- `saldoDeCaja`: la fórmula de §7, el movimiento programado que no cuenta (aunque su fecha ya haya pasado), los movimientos de otro dominio que no entran, el signo que ya trae `base` y el saldo negativo, que es válido.
- `saldosPorDominio`: una entrada por caja, los dos lados de una transferencia y el estado sin cajas.
- `sumarBolsaInicial`: las cuatro filas de P1b con su cifra en mh y su presentación, la fila única y la lista vacía, y las equivalencias de la partida.
- Las cifras del entregable de la fase: la bolsa de Tharan («46,518 mo») y la caja de Bree («340,6 mo»).

Crea `src/dominio/dinero/saldo.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { Fecha } from '../calendario/fecha'
import type { EstadoPartida } from '../modelo/documento'
import type { Caja } from '../modelo/dominios'
import type { Movimiento } from '../modelo/movimientos'
import { formatearOro } from './formato'
import { aBase } from './importe'
import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './monedas'
import { saldoDeCaja, saldosPorDominio, sumarBolsaInicial, type FilaMoneda } from './saldo'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El 12 de abril de 1640, la fecha actual del ejemplo. */
const HOY: Fecha = { anio: 1640, mes: 4, dia: 12 }

/** Oro tecleado → hierro: mo('0,6') = 60000 mh. */
function mo(cantidad: string): number {
  return aBase(cantidad, 'mo', EQ)
}

/** Una caja con su saldo inicial en mh. */
function caja(dominioId: string, saldoInicial: number): Caja {
  return { dominioId, saldoInicial: { base: saldoInicial } }
}

/** Un movimiento suelto: el signo va en `base` y `programado` decide si cuenta en el saldo (§7). */
function movimiento(
  id: string,
  dominioId: string,
  base: number,
  extra: { programado?: boolean; fecha?: Fecha } = {},
): Movimiento {
  return {
    id,
    dominioId,
    fecha: extra.fecha ?? HOY,
    tipo: base < 0 ? 'gasto' : 'ingreso',
    importe: { base },
    categoriaId: 'cat.otros',
    concepto: 'Prueba',
    origen: 'manual',
    programado: extra.programado ?? false,
  }
}

/** Un EstadoPartida con las 34 claves y todo vacío; cada prueba rellena lo que necesita. */
function estadoVacio(): EstadoPartida {
  return {
    partida: {
      id: 'p.prueba',
      nombre: 'Partida de prueba',
      edad: 'tercera',
      equivalencias: EQ,
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: HOY,
      fechaActual: HOY,
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T08:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [],
    cajas: [],
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

describe('saldoDeCaja', () => {
  it('una caja sin movimientos da su saldo inicial (§7)', () => {
    expect(saldoDeCaja(caja('dom.bree', 34000000), [])).toBe(34000000)
  })

  it('suma los movimientos no programados de su dominio (§7)', () => {
    const cuenta = caja('dom.tharan', mo('40,918'))
    const movimientos = [
      movimiento('mov.1', 'dom.tharan', mo('6')),
      movimiento('mov.2', 'dom.tharan', -mo('0,6')),
      movimiento('mov.3', 'dom.tharan', mo('0,2')),
    ]
    expect(saldoDeCaja(cuenta, movimientos)).toBe(4091800 + 600000 - 60000 + 20000)
  })

  it('no cuenta un movimiento programado, aunque su fecha ya haya pasado (§7)', () => {
    const cuenta = caja('dom.bree', 1000000)
    const pasadoSinAplicar = movimiento('mov.caravana', 'dom.bree', mo('12'), {
      programado: true,
      fecha: { anio: 1640, mes: 4, dia: 10 },
    })
    const pasadoAplicado = movimiento('mov.peaje', 'dom.bree', mo('0,3'), {
      fecha: { anio: 1640, mes: 4, dia: 10 },
    })
    expect(saldoDeCaja(cuenta, [pasadoSinAplicar, pasadoAplicado])).toBe(1030000)
  })

  it('no cuenta los movimientos de otro dominio', () => {
    const cuenta = caja('dom.bree', 1000000)
    const movimientos = [movimiento('mov.1', 'dom.archet', mo('50')), movimiento('mov.2', 'dom.bree', mo('1'))]
    expect(saldoDeCaja(cuenta, movimientos)).toBe(1100000)
  })

  it('no mira el tipo ni la fecha: el signo ya está en importe.base (decisión 18)', () => {
    const cuenta = caja('dom.tharan', 0)
    const futuroAplicado = movimiento('mov.futuro', 'dom.tharan', mo('3'), {
      fecha: { anio: 1640, mes: 12, dia: 31 },
    })
    expect(saldoDeCaja(cuenta, [futuroAplicado])).toBe(300000)
    expect(saldoDeCaja(cuenta, [movimiento('mov.gasto', 'dom.tharan', -mo('3'))])).toBe(-300000)
  })

  it('admite un saldo negativo, que una acción manual puede dejar (§6.4)', () => {
    const cuenta = caja('dom.archet', mo('85'))
    expect(saldoDeCaja(cuenta, [movimiento('mov.1', 'dom.archet', -mo('145'))])).toBe(-6000000)
  })
})

describe('saldosPorDominio', () => {
  it('da una entrada por caja, con el saldo de cada una', () => {
    const estado = estadoVacio()
    estado.cajas = [caja('dom.tharan', mo('40,918')), caja('dom.bree', mo('340'))]
    estado.movimientos = [movimiento('mov.1', 'dom.tharan', mo('5,6')), movimiento('mov.2', 'dom.bree', mo('0,6'))]
    expect(saldosPorDominio(estado)).toEqual({ 'dom.tharan': 4651800, 'dom.bree': 34060000 })
  })

  it('reparte los dos lados de una transferencia, cada uno en su dominio', () => {
    const estado = estadoVacio()
    estado.cajas = [caja('dom.bree', mo('100')), caja('dom.archet', mo('100'))]
    estado.movimientos = [
      { ...movimiento('mov.sale', 'dom.bree', -mo('60')), tipo: 'transferencia' },
      { ...movimiento('mov.entra', 'dom.archet', mo('60')), tipo: 'transferencia' },
    ]
    expect(saldosPorDominio(estado)).toEqual({ 'dom.bree': 4000000, 'dom.archet': 16000000 })
  })

  it('un estado sin cajas da un objeto vacío', () => {
    expect(saldosPorDominio(estadoVacio())).toEqual({})
  })
})

describe('sumarBolsaInicial', () => {
  it('suma las cuatro filas de P1b: 38 mo + 25 mp + 40 mb + 18 mc = 4.091.800 mh, «40,918 mo»', () => {
    const filas: FilaMoneda[] = [
      { cantidad: '38', moneda: 'mo' },
      { cantidad: '25', moneda: 'mp' },
      { cantidad: '40', moneda: 'mb' },
      { cantidad: '18', moneda: 'mc' },
    ]
    const total = sumarBolsaInicial(filas, EQ)
    expect(total).toBe(4091800)
    expect(formatearOro(total, EQ)).toBe('40,918 mo')
  })

  it('una sola fila da esa fila, y la lista vacía da 0', () => {
    expect(sumarBolsaInicial([{ cantidad: '0,6', moneda: 'mo' }], EQ)).toBe(60000)
    expect(sumarBolsaInicial([], EQ)).toBe(0)
  })

  it('usa las equivalencias de la partida, no las de por defecto', () => {
    const eq: Equivalencias = { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 2 }
    const filas: FilaMoneda[] = [
      { cantidad: '38', moneda: 'mo' },
      { cantidad: '25', moneda: 'mp' },
      { cantidad: '40', moneda: 'mb' },
      { cantidad: '18', moneda: 'mc' },
    ]
    // Con 1 me = 2 mh, 1 mo vale 20000 mh: 760000 + 50000 + 8000 + 360.
    expect(sumarBolsaInicial(filas, eq)).toBe(818360)
  })
})

describe('las cifras del entregable de la fase', () => {
  it('la bolsa de Tharan da 46,518 mo y la caja de Bree, 340,6 mo', () => {
    const bolsaInicial = sumarBolsaInicial(
      [
        { cantidad: '38', moneda: 'mo' },
        { cantidad: '25', moneda: 'mp' },
        { cantidad: '40', moneda: 'mb' },
        { cantidad: '18', moneda: 'mc' },
      ],
      EQ,
    )
    const bolsaDeTharan = saldoDeCaja(caja('dom.tharan', bolsaInicial), [movimiento('mov.1', 'dom.tharan', mo('5,6'))])
    expect(bolsaDeTharan).toBe(4651800)
    expect(formatearOro(bolsaDeTharan, EQ)).toBe('46,518 mo')

    const cajaDeBree = saldoDeCaja(caja('dom.bree', 34000000), [movimiento('mov.2', 'dom.bree', mo('0,6'))])
    expect(cajaDeBree).toBe(34060000)
    expect(formatearOro(cajaDeBree, EQ)).toBe('340,6 mo')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/dinero/saldo.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./saldo`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/dinero/saldo.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/dinero/saldo.test.ts [ src/dominio/dinero/saldo.test.ts ]
Error: Cannot find module './saldo' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/dinero/saldo.test.ts
 ❯ src/dominio/dinero/saldo.test.ts:9:1
      7| import { aBase } from './importe'
      8| import { EQUIVALENCIAS_POR_DEFECTO, type Equivalencias } from './monedas'
      9| import { saldoDeCaja, saldosPorDominio, sumarBolsaInicial, type FilaMoneda } from './saldo'
       | ^
     10|
     11| const EQ = EQUIVALENCIAS_POR_DEFECTO


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `saldo.ts`**

Crea `src/dominio/dinero/saldo.ts` con este contenido:

```ts
import type { Id } from '../modelo/comunes'
import type { EstadoPartida } from '../modelo/documento'
import type { Caja } from '../modelo/dominios'
import type { Movimiento } from '../modelo/movimientos'
import { aBase } from './importe'
import type { Equivalencias, Moneda } from './monedas'

/**
 * Saldo de una bolsa o caja en mh: saldo inicial + sus movimientos no programados (§7, §8).
 * Suma `importe.base`, que ya lleva el signo (decisión 18), de los movimientos de su mismo `dominioId`. No mira
 * `tipo` ni la fecha: un movimiento con fecha pasada que el avance todavía no ha aplicado sigue programado.
 */
export function saldoDeCaja(caja: Caja, movimientos: readonly Movimiento[]): number {
  return movimientos.reduce(
    (saldo, m) => (m.dominioId === caja.dominioId && !m.programado ? saldo + m.importe.base : saldo),
    caja.saldoInicial.base,
  )
}

/** Saldo de cada dominio de la partida, por dominioId; la caja que no tiene movimientos da su saldo inicial (§7). */
export function saldosPorDominio(estado: EstadoPartida): Record<Id, number> {
  const saldos: Record<Id, number> = {}
  for (const caja of estado.cajas) {
    saldos[caja.dominioId] = saldoDeCaja(caja, estado.movimientos)
  }
  return saldos
}

/** Una fila de la bolsa inicial de P1b: cantidad tecleada y moneda. */
export interface FilaMoneda {
  cantidad: string
  moneda: Moneda
}

/**
 * Suma en mh las filas de la bolsa inicial: 38 mo + 25 mp + 40 mb + 18 mc = 4.091.800 mh (§3, P1b).
 * Cada fila se redondea al mh por separado, como hace aBase; la bolsa de varias filas no guarda «introducido» (§3).
 */
export function sumarBolsaInicial(filas: readonly FilaMoneda[], eq: Equivalencias): number {
  return filas.reduce((total, fila) => total + aBase(fila.cantidad, fila.moneda, eq), 0)
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/dinero/saldo.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  10:41:07
   Duration  392ms (transform 55%, import 28%, worker 10%, tests 5%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que al `EstadoPartida` de la prueba le falta alguna de sus 34 claves o que un `Movimiento` no encaja con su esquema; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 416 pruebas en 32 archivos. La tarea 11 dejó 402 pruebas en 31 archivos, y esta tarea trae **14 nuevas**: las 13 de `saldo.test.ts` y **una más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/dinero/saldo.ts`.

```text
 Test Files  32 passed (32)
      Tests  416 passed (416)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/dinero/saldo.ts src/dominio/dinero/saldo.test.ts
git commit -m "feat(dinero): saldo de una caja, saldos por dominio y bolsa inicial de P1b" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/dinero/saldo.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/dinero/saldo.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 9f3ad21] feat(dinero): saldo de una caja, saldos por dominio y bolsa inicial de P1b
 2 files changed, 261 insertions(+)
 create mode 100644 src/dominio/dinero/saldo.test.ts
 create mode 100644 src/dominio/dinero/saldo.ts
```

---

### Tarea 13 · Validación: referencias, unicidades y coherencia

Los esquemas Zod de las tareas 2 a 6 comprueban la **forma**: tipos, enumeraciones, rangos y las coherencias de dentro de un registro. No pueden comprobar que un `categoriaId` apunte a una categoría que existe, que no haya dos ubicaciones con el mismo nombre ni que la fecha actual cuadre con los avances: eso hace falta mirar el documento entero. Esta tarea escribe los tres módulos que lo hacen, todos puros, y el formateador del detalle técnico que ve el jugador cuando una copia se rechaza.

Depende de la tarea 6 (el modelo completo: `DocumentoPartida`, `CatalogosEnCopia`) y de la tarea 8 (`RECURSO.viveres`, el id fijo y permanente del recurso de la partida). De la fase 1 usa `compararFechas`, `sumarDias` y `ANIO_MAXIMO` del calendario y `aBase` del dinero; de la tarea 7, `normalizarNombre` y `esNombreReservado`.

Las reglas, una a una, están en `contrato-modelo.md` §4.1 (referencias), §4.2 (unicidades), §4.3 (importes y equivalencias), §4.4 (fechas y recurrencias), §4.5 (coherencias entre registros) y §4.6 (el snapshot). Los mensajes literales están en `contrato-datos.md` §3.2. Quien ejecute esta tarea **no tiene que releerlos**: el código y las pruebas de abajo ya los llevan escritos.

**Reglas de la especificación que implementa:**

- **Validación estricta de la copia (decisión 14).** «Se rechaza la copia entera si falla cualquier regla estructural: tipos, enumeraciones, `validarFecha`, `validarRecurrencia`, `validarEquivalencias`, importes enteros seguros, **referencias y unicidades**. … Se admiten las referencias históricas previstas (`avanceId` de avances antiguos, `localId` ausente en `detalleLocales`, `objetoId` ausente en una venta). Mensajes: «Este archivo no es una copia de Gestión de Aldeas» y «La copia está dañada: \<detalle\>». **Los campos desconocidos se descartan.**»
- **Reglas comunes del nombre (§6.6).** «Se compara sin mayúsculas, tildes, diéresis ni espacios dobles. La ñ no equivale a la n.» Y los **reservados** por los filtros: «Todas», «Todos», «Todas las categorías», «Todas las ubicaciones» y «Todos los tipos» («Ese nombre lo usa el filtro»).
- **Ubicaciones calculadas (§6.6, patrón 5).** «Encima», «Caja de \<asentamiento\>» y «Almacén de \<asentamiento\>» salen de los dominios y no se guardan: una ubicación propia no puede llamarse igual que ellas.
- **«Víveres» es de la partida (§6.6 y §7).** El recurso `recurso.viveres` ni se renombra ni se elimina, su consumo sale de la ración y no se anota como consumo por habitante, y ningún otro recurso puede llamarse «víveres».
- **Saldo y programados (§7).** Un movimiento con fecha futura está programado. Lo contrario **no** se comprueba: la vuelta ya pasada de una caravana se aplica en el siguiente avance y sigue programada.
- **Solo un avance mueve la fecha actual (§4, §8, §9).** Sin avances, `fechaActual` es igual a `fechaInicial`; con avances, es el `hasta` del último. Los avances van ordenados y sin solaparse, y **se admiten huecos** (decisión 5: los anteriores al 31 de marzo no existen).
- **Solo el último avance guarda el snapshot (decisión 4).** «Deshacer avance» solo deshace el último, así que no hace falta más de una copia. `validarCopia` valida también ese snapshot y prefija sus rutas con `avances[n].snapshotPrevio.` (§4.6).
- **El detalle se lee igual venga de donde venga (decisión propia 29).** Las cuatro funciones devuelven `{ ruta, mensaje }` y un único formateador, `detalleDeProblemas`, escribe «✖ \<mensaje\>» y «  → en \<ruta\>». **No se usa `z.prettifyError`**, que escribe «→ at», en inglés: los errores de Zod pasan antes por `problemasDeZod`.
- **Lo que NO se comprueba y queda para el motor (decisión propia 27).** Que `Deuda.estado` cuadre con lo pendiente, que el acumulado de las producciones cuadre con los días, que las existencias cuadren con su historial y que el saldo de una caja sea el que muestran las vistas. Son cálculos de las fases 3 a 5.
- **El dominio es puro (plan de la fase 1).** Los tres módulos solo importan del propio dominio y, en `coherencia.ts`, el **tipo** `ZodError` con `import type * as z from 'zod'`. Zod está permitido en el dominio (decisión 15), y la prueba de pureza de la tarea 1 recorre los tres módulos nuevos.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/validacion/referencias.ts`, `src/dominio/validacion/unicidades.ts`, `src/dominio/validacion/coherencia.ts`
- Prueba: `src/dominio/validacion/referencias.test.ts`, `src/dominio/validacion/unicidades.test.ts`, `src/dominio/validacion/coherencia.test.ts`

Los tres archivos de prueba repiten a propósito el mismo constructor de datos (`documentoMinimo`, `catalogosMinimos` y `movimientoBase`): la partida de ejemplo no existe hasta la tarea 20 y el contrato no da ningún archivo de ayuda compartido para las pruebas del dominio. `documentoMinimo()` es un documento **válido**: el personaje, un asentamiento y todo lo que la validación exige de cada asentamiento (su caja, su población, la fila de víveres de su almacén y su mercado local), de modo que las tres funciones devuelven `[]` y cada prueba solo estropea lo que quiere comprobar.

- [ ] **Paso 1: Fijar con una prueba la forma de los errores de Zod 4.6.5**

`problemasDeZod` arma su ruta a partir de `issue.path`, y eso depende de cómo escribe Zod sus errores. Antes de escribir la función se fija con una prueba lo que la biblioteca hace de verdad: `issue.path` es un array de claves (`string`) e índices (`number`), `issue.code` dice qué falló, un error de la raíz trae el `path` vacío y `z.prettifyError` escribe «→ at», en inglés. **Esta prueba no falla**: no es una prueba de algo que haya que escribir, sino la que deja por escrito el comportamiento del que dependen las dos funciones del paso 7. Si un día Zod cambia esa forma, esta prueba lo dice antes que ninguna otra.

La carpeta `src/dominio/validacion/` es nueva. Crea `src/dominio/validacion/coherencia.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import * as z from 'zod'

/** Un esquema con la misma forma que los del modelo, para provocar errores de Zod de verdad. */
const EsquemaFechaDePrueba = z.object({ anio: z.int(), mes: z.int(), dia: z.int() }).check((ctx) => {
  if (ctx.value.mes === 4 && ctx.value.dia > 30) {
    ctx.issues.push({ code: 'custom', message: `Abril de ${ctx.value.anio} tiene 30 días`, input: ctx.value })
  }
})

const EsquemaDePrueba = z.object({
  partida: z.object({ nombre: z.string() }),
  movimientos: z.array(z.object({ id: z.string(), fecha: EsquemaFechaDePrueba })),
})

/** Un documento con una fecha imposible en el segundo movimiento. */
function conFechaImposible(): unknown {
  return {
    partida: { nombre: 'La Sombra del Este' },
    movimientos: [
      { id: 'mov.1', fecha: { anio: 1640, mes: 4, dia: 12 } },
      { id: 'mov.2', fecha: { anio: 1640, mes: 4, dia: 31 } },
    ],
  }
}

describe('la forma de los errores de Zod 4.6.5', () => {
  it('issue.path es un array de claves y de índices, e issue.code dice qué falló', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    expect(resultado.success).toBe(false)
    if (resultado.success) {
      return
    }
    expect(resultado.error.issues).toHaveLength(1)
    const issue = resultado.error.issues[0]
    expect(issue.path).toEqual(['movimientos', 1, 'fecha'])
    expect(issue.path.map((tramo) => typeof tramo)).toEqual(['string', 'number', 'string'])
    expect(issue.code).toBe('custom')
    expect(issue.message).toBe('Abril de 1640 tiene 30 días')
  })

  it('un error de la raíz trae el path vacío y el código invalid_type', () => {
    const resultado = EsquemaDePrueba.safeParse('esto no es un objeto')
    expect(resultado.success).toBe(false)
    if (resultado.success) {
      return
    }
    expect(resultado.error.issues[0].path).toEqual([])
    expect(resultado.error.issues[0].code).toBe('invalid_type')
  })

  it('z.prettifyError escribe «→ at», en inglés: por eso el detalle no lo usa', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    if (resultado.success) {
      throw new Error('el esquema debía rechazarlo')
    }
    expect(z.prettifyError(resultado.error)).toContain('→ at movimientos[1].fecha')
  })
})
```

Ejecútala:

```bash
npx vitest run src/dominio/validacion/coherencia.test.ts
```

Salida esperada (la hora y la duración varían). Las tres pasan: fijan lo que hace Zod, no lo que falta por escribir.

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  11:02:44
   Duration  428ms (transform 51%, import 33%, worker 9%, tests 5%)
```

- [ ] **Paso 2: Escribir la prueba que falla de `validarReferencias`**

Qué comprueba cada bloque: el documento mínimo sin problemas; el mensaje literal de un `categoriaId` inventado; las cuatro referencias históricas que la decisión 14 **admite**; los vínculos que no apuntan a su registro; un registro del personaje colgado de un asentamiento; el consumo de víveres, que no se anota; las cuatro relaciones de uno a uno (caja, población, víveres y mercado local); el edificio de otro asentamiento; y la producción realizada que apunta a una producción que su edificio no tiene.

Crea `src/dominio/validacion/referencias.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { validarReferencias } from './referencias'

/** Los catálogos mínimos que acompañan a una copia: una categoría y el recurso protegido «Víveres». */
function catalogosMinimos(): CatalogosEnCopia {
  return {
    opciones: [{ id: 'cat.otros', nombre: 'Otros', propia: false, lista: 'categorias', grupo: 'otros' }],
    recursos: [
      { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false },
    ],
  }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Un movimiento suelto, para colgarle lo que cada prueba necesite. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.otros',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

describe('validarReferencias', () => {
  it('el documento mínimo no da ningún problema', () => {
    expect(validarReferencias(documentoMinimo(), catalogosMinimos())).toEqual([])
  })

  it('un categoriaId que no está en el catálogo da el problema literal del contrato', () => {
    const documento = documentoMinimo()
    documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.posadas' }]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'movimientos[0].categoriaId', mensaje: 'No existe la categoría «cat.posadas»' },
    ])
  })

  it('no son error las referencias históricas que la decisión 14 admite', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      {
        ...movimientoBase('mov.1', 'dom.bree'),
        origen: 'avance',
        avanceId: 'av.borrado',
        regla: { tipo: 'locales', id: 'dom.bree' },
        detalleLocales: [
          {
            nombre: 'Herrería de Bree',
            mes: { anio: 1640, mes: 3 },
            produccion: { base: 100000 },
            anotada: true,
            impuesto: { base: 60000 },
          },
        ],
      },
      { ...movimientoBase('mov.venta', 'dom.tharan'), vinculo: { tipo: 'venta', id: 'venta.1' } },
    ]
    documento.ventas = [
      {
        id: 'venta.1',
        nombre: 'Daga élfica',
        valorAnotado: { base: 50000 },
        cantidad: 1,
        precioUnitario: { base: 60000 },
        movimientoId: 'mov.venta',
      },
    ]
    documento.hechizos = [{ id: 'hec.luz', dominioId: 'dom.tharan', nombre: 'Luz', estado: 'enEstudio' }]
    documento.intentos = [
      {
        id: 'int.1',
        hechizoId: 'hec.luz',
        fecha: { anio: 1640, mes: 4, dia: 10 },
        resultado: 'malo',
        pergaminoConsumido: false,
        pergaminoEliminado: true,
      },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([])
  })

  it('un vínculo que no apunta a su registro da el mensaje de su tipo', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...movimientoBase('mov.1', 'dom.tharan'), vinculo: { tipo: 'venta', id: 'venta.borrada' } },
      { ...movimientoBase('mov.2', 'dom.tharan'), vinculo: { tipo: 'pagoDeuda', id: 'pago.borrado' } },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'movimientos[0].vinculo.id', mensaje: 'No existe la venta «venta.borrada»' },
      { ruta: 'movimientos[1].vinculo.id', mensaje: 'No existe el pago de deuda «pago.borrado»' },
    ])
  })

  it('un registro del personaje que apunta a un asentamiento lo dice', () => {
    const documento = documentoMinimo()
    documento.hechizos = [{ id: 'hec.luz', dominioId: 'dom.bree', nombre: 'Luz', estado: 'enEstudio' }]
    expect(validarReferencias(documento, catalogosMinimos())).toContainEqual({
      ruta: 'hechizos[0].dominioId',
      mensaje: 'Este registro es del personaje y apunta a otro dominio',
    })
  })

  it('el consumo de víveres no se anota: sale de la ración', () => {
    const documento = documentoMinimo()
    documento.poblaciones[0].consumos = [
      { id: 'cons.1', nombre: 'Víveres', recursoId: 'recurso.viveres', porHabitante: 1 },
    ]
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      {
        ruta: 'poblaciones[0].consumos[0].recursoId',
        mensaje: 'El consumo de víveres sale de la ración y no se anota',
      },
    ])
  })

  it('cada dominio tiene una caja, y cada asentamiento su población, sus víveres y su mercado local', () => {
    const documento = documentoMinimo()
    documento.cajas = [
      { dominioId: 'dom.tharan', saldoInicial: { base: 0 } },
      { dominioId: 'dom.tharan', saldoInicial: { base: 0 } },
    ]
    documento.poblaciones = []
    documento.existencias = []
    documento.mercados = []
    expect(validarReferencias(documento, catalogosMinimos())).toEqual([
      { ruta: 'cajas', mensaje: 'Hay dos cajas de «dom.tharan»' },
      { ruta: 'cajas', mensaje: 'Falta la caja de «dom.bree»' },
      { ruta: 'poblaciones', mensaje: 'Falta la población de «dom.bree»' },
      { ruta: 'existencias', mensaje: 'Falta la fila de víveres del almacén de «dom.bree»' },
      { ruta: 'mercados', mensaje: 'Falta el mercado local de «dom.bree»' },
    ])
  })

  it('un edificio de otro asentamiento no vale ni para un trabajador ni para un impuesto', () => {
    const documento = documentoMinimo()
    documento.dominios.push({
      id: 'dom.archet',
      tipo: 'asentamiento',
      nombre: 'Archet',
      categoria: 'aldea',
      alta: { anio: 1640, mes: 3, dia: 31 },
    })
    documento.cajas.push({ dominioId: 'dom.archet', saldoInicial: { base: 0 } })
    documento.poblaciones.push({ dominioId: 'dom.archet', habitantesIniciales: 26, cambios: [], consumos: [] })
    documento.existencias.push({ dominioId: 'dom.archet', recursoId: 'recurso.viveres', cantidad: 10 })
    documento.mercados.push({ id: 'mer.archet', nombre: 'Archet', localDe: 'dom.archet', precios: [] })
    documento.edificios = [
      {
        id: 'ed.molino',
        dominioId: 'dom.bree',
        tipoId: 'edificio.molino',
        nombre: 'Molino',
        estado: 'activo',
        trabajadoresNecesarios: 1,
        producciones: [],
      },
    ]
    documento.trabajadores = [
      {
        id: 'tra.1',
        dominioId: 'dom.archet',
        oficioId: 'oficio.molinero',
        numero: 1,
        salario: { base: 30000 },
        recurrencia: { tipo: 'semanal', diaSemana: 4 },
        edificioId: 'ed.molino',
      },
    ]
    const catalogos = catalogosMinimos()
    catalogos.opciones.push(
      { id: 'edificio.molino', nombre: 'Molino', propia: false, lista: 'tiposEdificio', grupo: 'alimentos' },
      {
        id: 'oficio.molinero',
        nombre: 'Molinero',
        plural: 'Molineros',
        propia: false,
        lista: 'oficios',
        grupo: 'oficios',
      },
    )
    expect(validarReferencias(documento, catalogos)).toEqual([
      { ruta: 'trabajadores[0].edificioId', mensaje: 'No existe el edificio «ed.molino» en este asentamiento' },
    ])
  })

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

Ejecútala:

```bash
npx vitest run src/dominio/validacion/referencias.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./referencias`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/validacion/referencias.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/validacion/referencias.test.ts [ src/dominio/validacion/referencias.test.ts ]
Error: Cannot find module './referencias' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/validacion/referencias.test.ts
 ❯ src/dominio/validacion/referencias.test.ts:5:1
      3| import type { DocumentoPartida } from '../modelo/documento'
      4| import type { Movimiento } from '../modelo/movimientos'
      5| import { validarReferencias } from './referencias'
       | ^
      6|
      7| /** Los catálogos mínimos que acompañan a una copia: una categoría y …


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Implementar `referencias.ts`**

Cada bloque sigue el orden de las claves de `EsquemaEstadoPartida`, que es el orden canónico del documento (decisión propia 28): así el detalle sale siempre en el mismo orden. Las referencias históricas de la decisión 14 (`avanceId`, `detalleLocales[].localId`, `ventas[].objetoId`, `intentos[].pergaminoId` y los campos opcionales que la reasignación deja vacíos) sencillamente no se comprueban.

Crea `src/dominio/validacion/referencias.ts` con este contenido:

```ts
import { RECURSO } from '../catalogo/inicial'
import type { CatalogosEnCopia, ListaCatalogo } from '../modelo/catalogos'
import type { Id, UbicacionObjeto } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import type { Vinculo } from '../modelo/movimientos'

/** Un problema que no es de forma, con la ruta dentro del documento para que el detalle sea útil. */
export interface ProblemaDeCoherencia {
  ruta: string
  mensaje: string
}

/** Los ids de una colección de registros. */
function idsDe(registros: readonly { id: Id }[]): Set<Id> {
  return new Set(registros.map((r) => r.id))
}

/** Clave de una fila de almacén: un recurso por asentamiento. */
function claveExistencia(dominioId: Id, recursoId: Id): string {
  return `${dominioId}|${recursoId}`
}

/** Errores de referencia del documento: uno por id que no apunta a nada (§6.1, contrato-modelo §4.1). */
export function validarReferencias(documento: DocumentoPartida, catalogos: CatalogosEnCopia): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }
  const exige = (hay: boolean, ruta: string, mensaje: string): void => {
    if (!hay) {
      anota(ruta, mensaje)
    }
  }

  // ---- Índices ------------------------------------------------------------
  const dominios = idsDe(documento.dominios)
  const asentamientos = new Set(documento.dominios.filter((d) => d.tipo === 'asentamiento').map((d) => d.id))
  const personajes = documento.dominios.filter((d) => d.tipo === 'personaje')
  const personajeId = personajes.length === 1 ? personajes[0].id : undefined
  const opcionesDe = (lista: ListaCatalogo): Set<Id> =>
    new Set(catalogos.opciones.filter((o) => o.lista === lista).map((o) => o.id))
  const categorias = opcionesDe('categorias')
  const oficios = opcionesDe('oficios')
  const tiposEdificio = opcionesDe('tiposEdificio')
  const tiposUnidad = opcionesDe('tiposUnidad')
  const tiposDefensa = opcionesDe('tiposDefensa')
  const tiposAnimal = opcionesDe('tiposAnimal')
  const recursos = new Set(catalogos.recursos.map((r) => r.id))
  const movimientos = new Map(documento.movimientos.map((m) => [m.id, m]))
  const transferencias = idsDe(documento.transferencias)
  const deudas = idsDe(documento.deudas)
  const pagosDeuda = new Set(documento.deudas.flatMap((d) => d.pagos.map((p) => p.id)))
  const recurrentes = idsDe(documento.recurrentes)
  const objetos = idsDe(documento.objetos)
  const ventas = idsDe(documento.ventas)
  const inversiones = idsDe(documento.inversiones)
  const hechizos = idsDe(documento.hechizos)
  const pergaminos = idsDe(documento.pergaminos)
  const existencias = new Set(documento.existencias.map((e) => claveExistencia(e.dominioId, e.recursoId)))
  const entradasAlmacen = idsDe(documento.entradasAlmacen)
  const edificios = new Map(documento.edificios.map((e) => [e.id, e]))
  const trabajadores = idsDe(documento.trabajadores)
  const obras = new Map(documento.obras.map((o) => [o.id, o]))
  const impuestosRentas = new Map(documento.impuestosRentas.map((i) => [i.id, i]))
  const tiposLocal = new Map(documento.tiposLocal.map((t) => [t.id, t]))
  const localesComerciales = idsDe(documento.localesComerciales)
  const mercados = idsDe(documento.mercados)
  const caravanas = idsDe(documento.caravanas)
  const unidadesGuarnicion = idsDe(documento.unidadesGuarnicion)
  const defensas = new Map(documento.defensas.map((d) => [d.id, d]))
  const ubicaciones = idsDe(documento.ubicaciones)
  const personas = idsDe(documento.personas)

  /** El movimiento existe y su vínculo apunta a este registro. */
  const movimientoVinculado = (movimientoId: Id, tipo: Vinculo['tipo'], id: Id): boolean => {
    const m = movimientos.get(movimientoId)
    return m !== undefined && m.vinculo !== undefined && m.vinculo.tipo === tipo && m.vinculo.id === id
  }

  /** Un registro del personaje: el dominio existe y es el del personaje. */
  const exigePersonaje = (dominioId: Id, ruta: string): void => {
    if (!dominios.has(dominioId)) {
      anota(ruta, `No existe el dominio «${dominioId}»`)
    } else if (dominioId !== personajeId) {
      anota(ruta, 'Este registro es del personaje y apunta a otro dominio')
    }
  }

  /** «Encima» no apunta a nada; la caja y el almacén, a un asentamiento; «propia», a una ubicación. */
  const exigeUbicacion = (ubicacion: UbicacionObjeto, ruta: string): void => {
    if (ubicacion.tipo === 'caja' || ubicacion.tipo === 'almacen') {
      exige(
        asentamientos.has(ubicacion.dominioId),
        `${ruta}.dominioId`,
        `No existe el asentamiento «${ubicacion.dominioId}»`,
      )
    } else if (ubicacion.tipo === 'propia') {
      exige(
        ubicaciones.has(ubicacion.ubicacionId),
        `${ruta}.ubicacionId`,
        `No existe la ubicación «${ubicacion.ubicacionId}»`,
      )
    }
  }

  // ---- Dominios y cajas ---------------------------------------------------
  if (personajes.length !== 1) {
    anota('dominios', 'Una partida tiene un solo personaje')
  }
  documento.cajas.forEach((c, i) => {
    exige(dominios.has(c.dominioId), `cajas[${i}].dominioId`, `No existe el dominio «${c.dominioId}»`)
  })
  for (const dominio of documento.dominios) {
    const cuantas = documento.cajas.filter((c) => c.dominioId === dominio.id).length
    if (cuantas === 0) {
      anota('cajas', `Falta la caja de «${dominio.id}»`)
    } else if (cuantas > 1) {
      anota('cajas', `Hay dos cajas de «${dominio.id}»`)
    }
  }

  // ---- Movimientos --------------------------------------------------------
  documento.movimientos.forEach((m, i) => {
    const r = `movimientos[${i}]`
    exige(dominios.has(m.dominioId), `${r}.dominioId`, `No existe el dominio «${m.dominioId}»`)
    exige(categorias.has(m.categoriaId), `${r}.categoriaId`, `No existe la categoría «${m.categoriaId}»`)
    if (m.vinculo !== undefined) {
      const v = m.vinculo
      const ruta = `${r}.vinculo.id`
      switch (v.tipo) {
        case 'transferencia':
          exige(transferencias.has(v.id), ruta, `No existe la transferencia «${v.id}»`)
          break
        case 'venta':
          exige(ventas.has(v.id), ruta, `No existe la venta «${v.id}»`)
          break
        case 'altaDeuda':
          exige(deudas.has(v.id), ruta, `No existe la deuda «${v.id}»`)
          break
        case 'pagoDeuda':
          exige(pagosDeuda.has(v.id), ruta, `No existe el pago de deuda «${v.id}»`)
          break
        case 'capitalInversion':
        case 'retiradaInversion':
          exige(inversiones.has(v.id), ruta, `No existe la inversión «${v.id}»`)
          break
        case 'obra':
          exige(obras.has(v.id), ruta, `No existe la obra «${v.id}»`)
          break
        case 'caravana':
          exige(caravanas.has(v.id), ruta, `No existe la caravana «${v.id}»`)
          break
        case 'entradaAlmacen':
          exige(entradasAlmacen.has(v.id), ruta, `No existe la entrada de almacén «${v.id}»`)
          break
        case 'pergamino':
          exige(pergaminos.has(v.id), ruta, `No existe el pergamino «${v.id}»`)
          break
      }
    }
    if (m.regla !== undefined) {
      const g = m.regla
      const ruta = `${r}.regla.id`
      switch (g.tipo) {
        case 'salarios':
        case 'soldadas':
        case 'locales':
          exige(asentamientos.has(g.id), ruta, `No existe el asentamiento «${g.id}»`)
          break
        case 'tributo':
        case 'impuesto': {
          const impuesto = impuestosRentas.get(g.id)
          const sentido = g.tipo === 'tributo' ? 'tributo' : 'ingreso'
          exige(
            impuesto !== undefined && impuesto.sentido === sentido,
            ruta,
            `No existe el impuesto o tributo «${g.id}»`,
          )
          break
        }
        case 'recurrente':
          exige(recurrentes.has(g.id), ruta, `No existe el gasto o ingreso recurrente «${g.id}»`)
          break
        case 'beneficio':
          exige(inversiones.has(g.id), ruta, `No existe la inversión «${g.id}»`)
          break
      }
    }
    if (m.inversionId !== undefined) {
      exige(inversiones.has(m.inversionId), `${r}.inversionId`, `No existe la inversión «${m.inversionId}»`)
    }
    m.detalleLocales?.forEach((d, j) => {
      if (d.localId !== undefined) {
        exige(
          localesComerciales.has(d.localId),
          `${r}.detalleLocales[${j}].localId`,
          `No existe el local «${d.localId}»`,
        )
      }
    })
    m.detalleTrabajo?.forEach((d, j) => {
      if (d.origenId === undefined) {
        return
      }
      const ruta = `${r}.detalleTrabajo[${j}].origenId`
      if (m.regla !== undefined && m.regla.tipo === 'soldadas') {
        exige(unidadesGuarnicion.has(d.origenId), ruta, `No existe la unidad «${d.origenId}»`)
      } else {
        exige(trabajadores.has(d.origenId), ruta, `No existe el trabajador «${d.origenId}»`)
      }
    })
    if (m.objetoPendiente !== undefined) {
      exigeUbicacion(m.objetoPendiente.ubicacion, `${r}.objetoPendiente.ubicacion`)
    }
  })

  // ---- Transferencias -----------------------------------------------------
  documento.transferencias.forEach((t, i) => {
    const r = `transferencias[${i}]`
    exige(dominios.has(t.saleDeId), `${r}.saleDeId`, `No existe el dominio «${t.saleDeId}»`)
    exige(dominios.has(t.entraEnId), `${r}.entraEnId`, `No existe el dominio «${t.entraEnId}»`)
    const sale = movimientos.get(t.movimientoSaleId)
    exige(
      movimientoVinculado(t.movimientoSaleId, 'transferencia', t.id) &&
        sale !== undefined &&
        sale.dominioId === t.saleDeId,
      `${r}.movimientoSaleId`,
      `No existe el movimiento «${t.movimientoSaleId}» de la transferencia`,
    )
    const entra = movimientos.get(t.movimientoEntraId)
    exige(
      movimientoVinculado(t.movimientoEntraId, 'transferencia', t.id) &&
        entra !== undefined &&
        entra.dominioId === t.entraEnId,
      `${r}.movimientoEntraId`,
      `No existe el movimiento «${t.movimientoEntraId}» de la transferencia`,
    )
  })

  // ---- Deudas -------------------------------------------------------------
  documento.deudas.forEach((d, i) => {
    const r = `deudas[${i}]`
    exige(dominios.has(d.dominioId), `${r}.dominioId`, `No existe el dominio «${d.dominioId}»`)
    exige(personas.has(d.contraparteId), `${r}.contraparteId`, `No existe la persona o entidad «${d.contraparteId}»`)
    if (d.cuentaAltaId !== undefined) {
      exige(dominios.has(d.cuentaAltaId), `${r}.cuentaAltaId`, `No existe el dominio «${d.cuentaAltaId}»`)
    }
    d.pagos.forEach((p, j) => {
      exige(
        movimientoVinculado(p.movimientoId, 'pagoDeuda', p.id),
        `${r}.pagos[${j}].movimientoId`,
        `No existe el movimiento «${p.movimientoId}» del pago`,
      )
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

  // ---- Recurrentes --------------------------------------------------------
  documento.recurrentes.forEach((rec, i) => {
    const r = `recurrentes[${i}]`
    exige(dominios.has(rec.dominioId), `${r}.dominioId`, `No existe el dominio «${rec.dominioId}»`)
    exige(dominios.has(rec.cuentaId), `${r}.cuentaId`, `No existe el dominio «${rec.cuentaId}»`)
    exige(categorias.has(rec.categoriaId), `${r}.categoriaId`, `No existe la categoría «${rec.categoriaId}»`)
  })

  // ---- Personaje: inventario, ventas, inversiones y estudio ---------------
  documento.objetos.forEach((o, i) => {
    const r = `objetos[${i}]`
    exigePersonaje(o.dominioId, `${r}.dominioId`)
    exigeUbicacion(o.ubicacion, `${r}.ubicacion`)
    if (o.movimientoCompraId !== undefined) {
      exige(
        movimientos.has(o.movimientoCompraId),
        `${r}.movimientoCompraId`,
        `No existe el movimiento «${o.movimientoCompraId}»`,
      )
    }
  })
  documento.ventas.forEach((v, i) => {
    const r = `ventas[${i}]`
    if (v.objetoId !== undefined) {
      exige(objetos.has(v.objetoId), `${r}.objetoId`, `No existe el objeto «${v.objetoId}»`)
    }
    if (v.compradorId !== undefined) {
      exige(personas.has(v.compradorId), `${r}.compradorId`, `No existe la persona o entidad «${v.compradorId}»`)
    }
    exige(
      movimientoVinculado(v.movimientoId, 'venta', v.id),
      `${r}.movimientoId`,
      `No existe el movimiento «${v.movimientoId}» de la venta`,
    )
  })
  documento.inversiones.forEach((inv, i) => {
    const r = `inversiones[${i}]`
    exigePersonaje(inv.dominioId, `${r}.dominioId`)
    if (inv.cuentaCapitalId !== undefined) {
      exige(dominios.has(inv.cuentaCapitalId), `${r}.cuentaCapitalId`, `No existe el dominio «${inv.cuentaCapitalId}»`)
    }
    exige(
      dominios.has(inv.cuentaBeneficiosId),
      `${r}.cuentaBeneficiosId`,
      `No existe el dominio «${inv.cuentaBeneficiosId}»`,
    )
    if (inv.estado === 'retirada') {
      exige(
        movimientoVinculado(inv.retirada.movimientoId, 'retiradaInversion', inv.id),
        `${r}.retirada.movimientoId`,
        `No existe el movimiento «${inv.retirada.movimientoId}» de la retirada`,
      )
    }
  })
  documento.hechizos.forEach((h, i) => {
    exigePersonaje(h.dominioId, `hechizos[${i}].dominioId`)
  })
  documento.intentos.forEach((it, i) => {
    const r = `intentos[${i}]`
    exige(hechizos.has(it.hechizoId), `${r}.hechizoId`, `No existe el hechizo «${it.hechizoId}»`)
    if (it.pergaminoId !== undefined) {
      exige(pergaminos.has(it.pergaminoId), `${r}.pergaminoId`, `No existe el pergamino «${it.pergaminoId}»`)
    }
  })
  documento.pergaminos.forEach((p, i) => {
    const r = `pergaminos[${i}]`
    exigePersonaje(p.dominioId, `${r}.dominioId`)
    if (p.hechizoId !== undefined) {
      exige(hechizos.has(p.hechizoId), `${r}.hechizoId`, `No existe el hechizo «${p.hechizoId}»`)
    }
    if (p.objetoInventarioId !== undefined) {
      exige(
        objetos.has(p.objetoInventarioId),
        `${r}.objetoInventarioId`,
        `No existe el objeto «${p.objetoInventarioId}»`,
      )
    }
    if (p.movimientoCompraId !== undefined) {
      exige(
        movimientos.has(p.movimientoCompraId),
        `${r}.movimientoCompraId`,
        `No existe el movimiento «${p.movimientoCompraId}»`,
      )
    }
  })

  // ---- Población y almacén ------------------------------------------------
  documento.poblaciones.forEach((p, i) => {
    const r = `poblaciones[${i}]`
    exige(asentamientos.has(p.dominioId), `${r}.dominioId`, `No existe el asentamiento «${p.dominioId}»`)
    p.consumos.forEach((c, j) => {
      const ruta = `${r}.consumos[${j}].recursoId`
      if (c.recursoId === RECURSO.viveres) {
        anota(ruta, 'El consumo de víveres sale de la ración y no se anota')
      } else {
        exige(recursos.has(c.recursoId), ruta, `No existe el recurso «${c.recursoId}»`)
      }
    })
  })
  for (const id of asentamientos) {
    const cuantas = documento.poblaciones.filter((p) => p.dominioId === id).length
    if (cuantas === 0) {
      anota('poblaciones', `Falta la población de «${id}»`)
    } else if (cuantas > 1) {
      anota('poblaciones', `Hay dos poblaciones de «${id}»`)
    }
    if (!existencias.has(claveExistencia(id, RECURSO.viveres))) {
      anota('existencias', `Falta la fila de víveres del almacén de «${id}»`)
    }
    const locales = documento.mercados.filter((m) => m.localDe === id).length
    if (locales === 0) {
      anota('mercados', `Falta el mercado local de «${id}»`)
    } else if (locales > 1) {
      anota('mercados', `Hay dos mercados locales de «${id}»`)
    }
  }
  documento.existencias.forEach((e, i) => {
    const r = `existencias[${i}]`
    exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    exige(recursos.has(e.recursoId), `${r}.recursoId`, `No existe el recurso «${e.recursoId}»`)
  })
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

  // ---- Edificios, producción, trabajadores y obras ------------------------
  documento.edificios.forEach((e, i) => {
    const r = `edificios[${i}]`
    exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    exige(tiposEdificio.has(e.tipoId), `${r}.tipoId`, `No existe el tipo de edificio «${e.tipoId}»`)
    e.producciones.forEach((p, j) => {
      exige(recursos.has(p.recursoId), `${r}.producciones[${j}].recursoId`, `No existe el recurso «${p.recursoId}»`)
    })
    if (e.avisoPendiente !== undefined) {
      const obra = obras.get(e.avisoPendiente.obraId)
      exige(
        obra !== undefined && obra.estado === 'terminada',
        `${r}.avisoPendiente.obraId`,
        `No existe la obra «${e.avisoPendiente.obraId}»`,
      )
    }
  })
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
  documento.trabajadores.forEach((t, i) => {
    const r = `trabajadores[${i}]`
    exige(asentamientos.has(t.dominioId), `${r}.dominioId`, `No existe el asentamiento «${t.dominioId}»`)
    exige(oficios.has(t.oficioId), `${r}.oficioId`, `No existe el oficio «${t.oficioId}»`)
    if (t.edificioId !== undefined) {
      const e = edificios.get(t.edificioId)
      exige(
        e !== undefined && e.dominioId === t.dominioId,
        `${r}.edificioId`,
        `No existe el edificio «${t.edificioId}» en este asentamiento`,
      )
    }
  })
  documento.obras.forEach((o, i) => {
    const r = `obras[${i}]`
    exige(asentamientos.has(o.dominioId), `${r}.dominioId`, `No existe el asentamiento «${o.dominioId}»`)
    for (const recursoId of Object.keys(o.materiales)) {
      exige(recursos.has(recursoId), `${r}.materiales.${recursoId}`, `No existe el recurso «${recursoId}»`)
    }
    const efecto = o.efecto
    switch (efecto.tipo) {
      case 'crearEdificio':
        exige(
          tiposEdificio.has(efecto.tipoId),
          `${r}.efecto.tipoId`,
          `No existe el tipo de edificio «${efecto.tipoId}»`,
        )
        break
      case 'crearDefensa':
        exige(tiposDefensa.has(efecto.tipoId), `${r}.efecto.tipoId`, `No existe el tipo de defensa «${efecto.tipoId}»`)
        break
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
      case 'ampliarAlmacen':
        exige(recursos.has(efecto.recursoId), `${r}.efecto.recursoId`, `No existe el recurso «${efecto.recursoId}»`)
        break
    }
    if (o.movimientoId !== undefined) {
      exige(movimientos.has(o.movimientoId), `${r}.movimientoId`, `No existe el movimiento «${o.movimientoId}»`)
    }
  })

  // ---- Impuestos, tipos de local y locales comerciales --------------------
  documento.impuestosRentas.forEach((imp, i) => {
    const r = `impuestosRentas[${i}]`
    exige(asentamientos.has(imp.dominioId), `${r}.dominioId`, `No existe el asentamiento «${imp.dominioId}»`)
    exige(categorias.has(imp.categoriaId), `${r}.categoriaId`, `No existe la categoría «${imp.categoriaId}»`)
    if (imp.destinatarioId !== undefined) {
      exige(
        personas.has(imp.destinatarioId),
        `${r}.destinatarioId`,
        `No existe la persona o entidad «${imp.destinatarioId}»`,
      )
    }
    if (imp.edificioId !== undefined) {
      const e = edificios.get(imp.edificioId)
      exige(
        e !== undefined && e.dominioId === imp.dominioId,
        `${r}.edificioId`,
        `No existe el edificio «${imp.edificioId}» en este asentamiento`,
      )
    }
  })
  documento.tiposLocal.forEach((t, i) => {
    exige(asentamientos.has(t.dominioId), `tiposLocal[${i}].dominioId`, `No existe el asentamiento «${t.dominioId}»`)
  })
  documento.localesComerciales.forEach((l, i) => {
    const r = `localesComerciales[${i}]`
    exige(asentamientos.has(l.dominioId), `${r}.dominioId`, `No existe el asentamiento «${l.dominioId}»`)
    const tipo = tiposLocal.get(l.tipoId)
    exige(
      tipo !== undefined && tipo.dominioId === l.dominioId,
      `${r}.tipoId`,
      `No existe el tipo de local «${l.tipoId}» en este asentamiento`,
    )
    if (l.titularId !== undefined) {
      exige(personas.has(l.titularId), `${r}.titularId`, `No existe la persona o entidad «${l.titularId}»`)
    }
  })

  // ---- Comercio -----------------------------------------------------------
  documento.mercados.forEach((m, i) => {
    const r = `mercados[${i}]`
    if (m.localDe !== undefined) {
      exige(asentamientos.has(m.localDe), `${r}.localDe`, `No existe el asentamiento «${m.localDe}»`)
    }
    m.precios.forEach((p, j) => {
      exige(recursos.has(p.recursoId), `${r}.precios[${j}].recursoId`, `No existe el recurso «${p.recursoId}»`)
    })
  })
  documento.rutas.forEach((ru, i) => {
    const r = `rutas[${i}]`
    exige(asentamientos.has(ru.origenId), `${r}.origenId`, `No existe el asentamiento «${ru.origenId}»`)
    if (ru.destino.tipo === 'mercado') {
      exige(mercados.has(ru.destino.id), `${r}.destino.id`, `No existe el mercado «${ru.destino.id}»`)
    } else {
      exige(asentamientos.has(ru.destino.id), `${r}.destino.id`, `No existe el asentamiento «${ru.destino.id}»`)
    }
  })
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
      exige(
        movimientoVinculado(c.movimientoSalidaId, 'caravana', c.id),
        `${r}.movimientoSalidaId`,
        `No existe el movimiento «${c.movimientoSalidaId}» de la caravana`,
      )
    }
    if (c.movimientoVueltaId !== undefined) {
      exige(
        movimientoVinculado(c.movimientoVueltaId, 'caravana', c.id),
        `${r}.movimientoVueltaId`,
        `No existe el movimiento «${c.movimientoVueltaId}» de la caravana`,
      )
    }
  })

  // ---- Guarnición, defensas, animales y armería ---------------------------
  documento.unidadesGuarnicion.forEach((u, i) => {
    const r = `unidadesGuarnicion[${i}]`
    exige(asentamientos.has(u.dominioId), `${r}.dominioId`, `No existe el asentamiento «${u.dominioId}»`)
    exige(tiposUnidad.has(u.tipoId), `${r}.tipoId`, `No existe el tipo de unidad «${u.tipoId}»`)
  })
  documento.defensas.forEach((d, i) => {
    const r = `defensas[${i}]`
    exige(asentamientos.has(d.dominioId), `${r}.dominioId`, `No existe el asentamiento «${d.dominioId}»`)
    exige(tiposDefensa.has(d.tipoId), `${r}.tipoId`, `No existe el tipo de defensa «${d.tipoId}»`)
  })
  documento.animales.forEach((a, i) => {
    const r = `animales[${i}]`
    exige(asentamientos.has(a.dominioId), `${r}.dominioId`, `No existe el asentamiento «${a.dominioId}»`)
    exige(tiposAnimal.has(a.tipoId), `${r}.tipoId`, `No existe el tipo de animal «${a.tipoId}»`)
  })
  documento.armeria.forEach((o, i) => {
    exige(asentamientos.has(o.dominioId), `armeria[${i}].dominioId`, `No existe el asentamiento «${o.dominioId}»`)
  })

  // ---- Eventos ------------------------------------------------------------
  documento.eventos.forEach((e, i) => {
    const r = `eventos[${i}]`
    if (e.dominioId !== undefined) {
      exige(asentamientos.has(e.dominioId), `${r}.dominioId`, `No existe el asentamiento «${e.dominioId}»`)
    }
    e.efectos.forEach((ef, j) => {
      const ruta = `${r}.efectos[${j}].objetivo.id`
      const objetivo = ef.objetivo
      if (objetivo.tipo === 'edificio') {
        const ed = edificios.get(objetivo.id)
        exige(
          ed !== undefined && ed.dominioId === e.dominioId,
          ruta,
          `No existe el edificio «${objetivo.id}» en este asentamiento`,
        )
      } else if (objetivo.tipo === 'recurso') {
        exige(recursos.has(objetivo.id), ruta, `No existe el recurso «${objetivo.id}»`)
      } else if (objetivo.tipo === 'impuesto') {
        const imp = impuestosRentas.get(objetivo.id)
        exige(
          imp !== undefined && imp.dominioId === e.dominioId,
          ruta,
          `No existe el impuesto o renta «${objetivo.id}» en este asentamiento`,
        )
      }
    })
  })

  return problemas
}
```

Ejecuta la prueba y mírala pasar:

```bash
npx vitest run src/dominio/validacion/referencias.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  11:08:31
   Duration  512ms (transform 58%, import 27%, worker 8%, tests 5%)
```

- [ ] **Paso 4: Escribir la prueba que falla de `validarUnicidades`**

Qué comprueba cada bloque: el documento mínimo sin problemas; dos registros con el mismo id, con la ruta del **segundo**; los ids de las listas de dentro (un pago de deuda que repite el id de un movimiento); las ubicaciones, que además no pueden llamarse como las calculadas («Encima» y «Almacén de Bree»); personas, hechizos y mercados; los animales y las existencias por clave compuesta; las rutas en los dos sentidos; y el catálogo entero (ids, nombres por lista contando el plural de los oficios, el recurso «víveres» y los nombres que usa el filtro).

Crea `src/dominio/validacion/unicidades.test.ts` con este contenido. Los tres constructores del principio son los mismos del paso 2:

```ts
import { describe, expect, it } from 'vitest'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { validarUnicidades } from './unicidades'

/** Los catálogos mínimos que acompañan a una copia: una categoría y el recurso protegido «Víveres». */
function catalogosMinimos(): CatalogosEnCopia {
  return {
    opciones: [{ id: 'cat.otros', nombre: 'Otros', propia: false, lista: 'categorias', grupo: 'otros' }],
    recursos: [
      { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false },
    ],
  }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Un movimiento suelto, para colgarle lo que cada prueba necesite. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.otros',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

describe('validarUnicidades', () => {
  it('el documento mínimo no da ningún problema', () => {
    expect(validarUnicidades(documentoMinimo(), catalogosMinimos())).toEqual([])
  })

  it('dos registros con el mismo id, con la ruta del segundo', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      movimientoBase('mov.posada.12abril', 'dom.tharan'),
      movimientoBase('mov.posada.12abril', 'dom.tharan'),
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'movimientos[1].id', mensaje: 'El identificador «mov.posada.12abril» está repetido' },
    ])
  })

  it('cuenta también los ids de las listas de dentro (decisión propia 24)', () => {
    const documento = documentoMinimo()
    documento.personas = [{ id: 'persona.gremio-bree', nombre: 'Gremio de mercaderes de Bree' }]
    documento.movimientos = [
      { ...movimientoBase('mov.pago', 'dom.tharan'), vinculo: { tipo: 'pagoDeuda', id: 'mov.pago' } },
    ]
    documento.deudas = [
      {
        id: 'deuda.gremio',
        dominioId: 'dom.tharan',
        sentido: 'debo',
        contraparteId: 'persona.gremio-bree',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        principal: { base: 4200000 },
        interesPct: 0,
        estado: 'abierta',
        impago: false,
        pagos: [
          {
            id: 'mov.pago',
            fecha: { anio: 1640, mes: 4, dia: 10 },
            importe: { base: 1500000 },
            aplicarA: 'interesesYCapital',
            movimientoId: 'mov.pago',
          },
        ],
        devengos: [],
      },
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'deudas[0].pagos[0].id', mensaje: 'El identificador «mov.pago» está repetido' },
    ])
  })

  it('las ubicaciones no se repiten y no chocan con «Almacén de Bree» ni con «Encima»', () => {
    const documento = documentoMinimo()
    documento.ubicaciones = [
      { id: 'ubi.1', nombre: 'Posada El Poney Pisador' },
      { id: 'ubi.2', nombre: '  posada   el  poney pisador ' },
      { id: 'ubi.3', nombre: 'ALMACÉN DE BREE' },
      { id: 'ubi.4', nombre: 'Encima' },
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'ubicaciones[1].nombre', mensaje: 'Ya existe la ubicación «  posada   el  poney pisador »' },
      { ruta: 'ubicaciones[2].nombre', mensaje: 'Ya existe la ubicación «ALMACÉN DE BREE»' },
      { ruta: 'ubicaciones[3].nombre', mensaje: 'Ya existe la ubicación «Encima»' },
    ])
  })

  it('personas, hechizos y mercados tienen cada uno su mensaje', () => {
    const documento = documentoMinimo()
    documento.personas = [
      { id: 'persona.1', nombre: 'Gremio de mercaderes de Bree' },
      { id: 'persona.2', nombre: 'gremio de mercaderes de bree' },
    ]
    documento.hechizos = [
      { id: 'hec.1', dominioId: 'dom.tharan', nombre: 'Luz', estado: 'enEstudio' },
      { id: 'hec.2', dominioId: 'dom.tharan', nombre: 'luz', estado: 'enEstudio' },
    ]
    documento.mercados.push({ id: 'mer.otro', nombre: 'Bree', precios: [] })
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'personas[1].nombre', mensaje: 'Ya existe «gremio de mercaderes de bree» en Personas y entidades' },
      { ruta: 'hechizos[1].nombre', mensaje: 'Ya tienes el hechizo «luz»' },
      { ruta: 'mercados[1].nombre', mensaje: 'Ya existe el mercado «Bree»' },
    ])
  })

  it('dos animales del mismo tipo y género y dos filas del mismo recurso en un almacén', () => {
    const documento = documentoMinimo()
    documento.animales = [
      { id: 'ani.1', dominioId: 'dom.bree', tipoId: 'animal.vaca', cantidad: 12, genero: 'hembra' },
      { id: 'ani.2', dominioId: 'dom.bree', tipoId: 'animal.vaca', cantidad: 3, genero: 'hembra' },
    ]
    documento.existencias.push({ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 5 })
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'animales[1]', mensaje: '«dom.bree» ya tiene una fila de ese tipo y ese género' },
      { ruta: 'existencias[1]', mensaje: 'El almacén de «dom.bree» repite la fila de «recurso.viveres»' },
    ])
  })

  it('una ruta no se repite, tampoco en el sentido inverso entre dos asentamientos (decisión propia 32)', () => {
    const documento = documentoMinimo()
    documento.dominios.push({
      id: 'dom.archet',
      tipo: 'asentamiento',
      nombre: 'Archet',
      categoria: 'aldea',
      alta: { anio: 1640, mes: 3, dia: 31 },
    })
    documento.cajas.push({ dominioId: 'dom.archet', saldoInicial: { base: 0 } })
    documento.rutas = [
      { origenId: 'dom.bree', destino: { tipo: 'asentamiento', id: 'dom.archet' }, diasViaje: 1 },
      { origenId: 'dom.archet', destino: { tipo: 'asentamiento', id: 'dom.bree' }, diasViaje: 1 },
      { origenId: 'dom.bree', destino: { tipo: 'mercado', id: 'mer.fornost' }, diasViaje: 4 },
      { origenId: 'dom.bree', destino: { tipo: 'mercado', id: 'mer.fornost' }, diasViaje: 4 },
    ]
    expect(validarUnicidades(documento, catalogosMinimos())).toEqual([
      { ruta: 'rutas[1]', mensaje: 'Ya hay una ruta entre «dom.archet» y «dom.bree»' },
      { ruta: 'rutas[3]', mensaje: 'Ya hay una ruta entre «dom.bree» y «mer.fornost»' },
    ])
  })

  it('el catálogo: ids repetidos, nombres iguales en una lista, «víveres» y los nombres del filtro', () => {
    const catalogos = catalogosMinimos()
    catalogos.opciones.push(
      { id: 'cat.otros', nombre: 'Peajes', propia: true, lista: 'categorias', grupo: 'tuyas' },
      { id: 'cat.otros-2', nombre: 'otros', propia: true, lista: 'categorias', grupo: 'tuyas' },
      { id: 'cat.todas', nombre: 'Todas', propia: true, lista: 'categorias', grupo: 'tuyas' },
      { id: 'oficio.otros', nombre: 'Otros', propia: true, lista: 'oficios', grupo: 'oficios', plural: 'Otros' },
    )
    catalogos.recursos.push({
      id: 'recurso.provisiones',
      nombre: 'víveres',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: true,
    })
    expect(validarUnicidades(documentoMinimo(), catalogos)).toEqual([
      { ruta: 'catalogos.opciones[1].id', mensaje: 'El identificador «cat.otros» está repetido' },
      { ruta: 'catalogos.opciones[2].nombre', mensaje: 'Ya existe «otros» en esta lista' },
      { ruta: 'catalogos.opciones[4].plural', mensaje: 'Ya existe «Otros» en esta lista' },
      { ruta: 'catalogos.recursos[1].nombre', mensaje: 'Ya existe el recurso «víveres»' },
      { ruta: 'catalogos.recursos[1].nombre', mensaje: '«Víveres» lo crea la partida con su ración' },
      { ruta: 'catalogos.opciones[3].nombre', mensaje: 'Ese nombre lo usa el filtro' },
    ])
  })
})
```

Ejecútala:

```bash
npx vitest run src/dominio/validacion/unicidades.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./unicidades`, que todavía no existe:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/validacion/unicidades.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/validacion/unicidades.test.ts [ src/dominio/validacion/unicidades.test.ts ]
Error: Cannot find module './unicidades' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/validacion/unicidades.test.ts
 ❯ src/dominio/validacion/unicidades.test.ts:5:1
      3| import type { DocumentoPartida } from '../modelo/documento'
      4| import type { Movimiento } from '../modelo/movimientos'
      5| import { validarUnicidades } from './unicidades'
       | ^
      6|
      7| /** Los catálogos mínimos que acompañan a una copia: una categoría y …


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 5: Implementar `unicidades.ts`**

El mercado local lleva **a propósito** el nombre de su asentamiento (§8 y `contrato-modelo.md` §4.5), así que se queda fuera de la unicidad de nombre: la comprobación «distinto del nombre de cualquier asentamiento» solo se aplica a los mercados que no son locales, contra los asentamientos y contra los mercados locales.

Crea `src/dominio/validacion/unicidades.ts` con este contenido:

```ts
import { RECURSO } from '../catalogo/inicial'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { AnioMes, Id, RecurrenciaProduccion } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { esNombreReservado, normalizarNombre } from '../texto/normalizar'
import type { ProblemaDeCoherencia } from './referencias'

/** Un nombre con la ruta donde está escrito, para las unicidades de nombre de §6.6. */
interface NombreEnRuta {
  ruta: string
  nombre: string
}

/** «1640-04», la clave de un mes anotado en un local. */
function textoDeMes(mes: AnioMes): string {
  return `${mes.anio}-${String(mes.mes).padStart(2, '0')}`
}

/** Clave canónica de una frecuencia de producción: dos producciones del mismo edificio no pueden repetirla (§6.4). */
function claveRecurrencia(r: RecurrenciaProduccion): string {
  const fecha = (f?: { anio: number; mes: number; dia: number }): string =>
    f === undefined ? '' : `${f.anio}-${f.mes}-${f.dia}`
  switch (r.tipo) {
    case 'diaria':
      return `diaria|${fecha(r.inicio)}`
    case 'cadaNDias':
      return `cadaNDias|${r.n}|${fecha(r.primera)}`
    case 'semanal':
      return `semanal|${r.diaSemana}|${fecha(r.inicio)}`
    case 'quincenal':
      return `quincenal|${fecha(r.primera)}`
    case 'mensual':
      return `mensual|${r.diaMes}|${fecha(r.inicio)}`
    case 'cadaNMeses':
      return `cadaNMeses|${r.n}|${r.diaMes}|${fecha(r.primera)}`
    case 'trimestral':
      return `trimestral|${r.diaMes}|${fecha(r.primera)}`
    case 'anual':
      return `anual|${r.mes}|${r.diaMes}|${fecha(r.inicio)}`
  }
}

/** Todos los ids del documento con su ruta, también los de las listas de dentro (decisión propia 24). */
function idsDelDocumento(documento: DocumentoPartida): { ruta: string; id: Id }[] {
  const ids: { ruta: string; id: Id }[] = [{ ruta: 'partida.id', id: documento.partida.id }]
  const anota = (ruta: string, id: Id): void => {
    ids.push({ ruta, id })
  }
  documento.dominios.forEach((d, i) => anota(`dominios[${i}].id`, d.id))
  documento.movimientos.forEach((m, i) => anota(`movimientos[${i}].id`, m.id))
  documento.transferencias.forEach((t, i) => anota(`transferencias[${i}].id`, t.id))
  documento.deudas.forEach((d, i) => {
    anota(`deudas[${i}].id`, d.id)
    d.pagos.forEach((p, j) => anota(`deudas[${i}].pagos[${j}].id`, p.id))
  })
  documento.recurrentes.forEach((r, i) => anota(`recurrentes[${i}].id`, r.id))
  documento.objetos.forEach((o, i) => anota(`objetos[${i}].id`, o.id))
  documento.ventas.forEach((v, i) => anota(`ventas[${i}].id`, v.id))
  documento.inversiones.forEach((inv, i) => anota(`inversiones[${i}].id`, inv.id))
  documento.hechizos.forEach((h, i) => anota(`hechizos[${i}].id`, h.id))
  documento.intentos.forEach((it, i) => anota(`intentos[${i}].id`, it.id))
  documento.pergaminos.forEach((p, i) => anota(`pergaminos[${i}].id`, p.id))
  documento.poblaciones.forEach((p, i) => {
    p.cambios.forEach((c, j) => anota(`poblaciones[${i}].cambios[${j}].id`, c.id))
    p.consumos.forEach((c, j) => anota(`poblaciones[${i}].consumos[${j}].id`, c.id))
  })
  documento.ajustesExistencias.forEach((a, i) => anota(`ajustesExistencias[${i}].id`, a.id))
  documento.entradasAlmacen.forEach((e, i) => anota(`entradasAlmacen[${i}].id`, e.id))
  documento.edificios.forEach((e, i) => {
    anota(`edificios[${i}].id`, e.id)
    e.producciones.forEach((p, j) => anota(`edificios[${i}].producciones[${j}].id`, p.id))
  })
  documento.produccionesRealizadas.forEach((p, i) => anota(`produccionesRealizadas[${i}].id`, p.id))
  documento.trabajadores.forEach((t, i) => anota(`trabajadores[${i}].id`, t.id))
  documento.obras.forEach((o, i) => anota(`obras[${i}].id`, o.id))
  documento.impuestosRentas.forEach((imp, i) => anota(`impuestosRentas[${i}].id`, imp.id))
  documento.tiposLocal.forEach((t, i) => anota(`tiposLocal[${i}].id`, t.id))
  documento.localesComerciales.forEach((l, i) => anota(`localesComerciales[${i}].id`, l.id))
  documento.mercados.forEach((m, i) => anota(`mercados[${i}].id`, m.id))
  documento.caravanas.forEach((c, i) => anota(`caravanas[${i}].id`, c.id))
  documento.unidadesGuarnicion.forEach((u, i) => anota(`unidadesGuarnicion[${i}].id`, u.id))
  documento.defensas.forEach((d, i) => anota(`defensas[${i}].id`, d.id))
  documento.animales.forEach((a, i) => anota(`animales[${i}].id`, a.id))
  documento.armeria.forEach((o, i) => anota(`armeria[${i}].id`, o.id))
  documento.eventos.forEach((e, i) => anota(`eventos[${i}].id`, e.id))
  documento.ubicaciones.forEach((u, i) => anota(`ubicaciones[${i}].id`, u.id))
  documento.personas.forEach((p, i) => anota(`personas[${i}].id`, p.id))
  documento.avances.forEach((a, i) => anota(`avances[${i}].id`, a.id))
  return ids
}

/** Errores de unicidad: ids repetidos y los nombres únicos de §6.6 (contrato-modelo §4.2). */
export function validarUnicidades(documento: DocumentoPartida, catalogos: CatalogosEnCopia): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }

  /** Anota el segundo y siguientes que repiten una clave; `vistas` puede venir con claves ya ocupadas. */
  const sinRepetir = (
    entradas: readonly { ruta: string; clave: string }[],
    mensaje: (entrada: { ruta: string; clave: string }) => string,
    vistas: Set<string> = new Set(),
  ): void => {
    for (const entrada of entradas) {
      if (vistas.has(entrada.clave)) {
        anota(entrada.ruta, mensaje(entrada))
      } else {
        vistas.add(entrada.clave)
      }
    }
  }

  /** Lo mismo, comparando nombres normalizados y escribiendo el nombre tal cual en el mensaje. */
  const nombresUnicos = (
    nombres: readonly NombreEnRuta[],
    mensaje: (nombre: string) => string,
    ocupados: Set<string> = new Set(),
  ): void => {
    for (const n of nombres) {
      const clave = normalizarNombre(n.nombre)
      if (ocupados.has(clave)) {
        anota(n.ruta, mensaje(n.nombre))
      } else {
        ocupados.add(clave)
      }
    }
  }

  // ---- Ids ----------------------------------------------------------------
  sinRepetir(
    idsDelDocumento(documento).map((e) => ({ ruta: e.ruta, clave: e.id })),
    (e) => `El identificador «${e.clave}» está repetido`,
  )
  sinRepetir(
    catalogos.opciones.map((o, i) => ({ ruta: `catalogos.opciones[${i}].id`, clave: o.id })),
    (e) => `El identificador «${e.clave}» está repetido`,
  )
  sinRepetir(
    catalogos.recursos.map((r, i) => ({ ruta: `catalogos.recursos[${i}].id`, clave: r.id })),
    (e) => `El identificador «${e.clave}» está repetido`,
  )

  // ---- Nombres del catálogo ----------------------------------------------
  const nombresDeOpcion: NombreEnRuta[] = []
  catalogos.opciones.forEach((o, i) => {
    nombresDeOpcion.push({ ruta: `catalogos.opciones[${i}].nombre`, nombre: o.nombre })
    if (o.lista === 'oficios') {
      nombresDeOpcion.push({ ruta: `catalogos.opciones[${i}].plural`, nombre: o.plural })
    }
  })
  for (const lista of ['categorias', 'oficios', 'tiposEdificio', 'tiposUnidad', 'tiposDefensa', 'tiposAnimal'] as const) {
    const deLaLista: NombreEnRuta[] = []
    catalogos.opciones.forEach((o, i) => {
      if (o.lista !== lista) {
        return
      }
      deLaLista.push({ ruta: `catalogos.opciones[${i}].nombre`, nombre: o.nombre })
      if (o.lista === 'oficios') {
        deLaLista.push({ ruta: `catalogos.opciones[${i}].plural`, nombre: o.plural })
      }
    })
    nombresUnicos(deLaLista, (nombre) => `Ya existe «${nombre}» en esta lista`)
  }
  nombresUnicos(
    catalogos.recursos.map((r, i) => ({ ruta: `catalogos.recursos[${i}].nombre`, nombre: r.nombre })),
    (nombre) => `Ya existe el recurso «${nombre}»`,
  )
  catalogos.recursos.forEach((r, i) => {
    if (r.id !== RECURSO.viveres && normalizarNombre(r.nombre) === 'viveres') {
      anota(`catalogos.recursos[${i}].nombre`, '«Víveres» lo crea la partida con su ración')
    }
  })

  // ---- Nombres de la partida ---------------------------------------------
  const asentamientos = documento.dominios.filter((d) => d.tipo === 'asentamiento')
  const calculadas = new Set<string>(['encima'])
  for (const a of asentamientos) {
    calculadas.add(normalizarNombre(`caja de ${a.nombre}`))
    calculadas.add(normalizarNombre(`almacen de ${a.nombre}`))
  }
  nombresUnicos(
    documento.ubicaciones.map((u, i) => ({ ruta: `ubicaciones[${i}].nombre`, nombre: u.nombre })),
    (nombre) => `Ya existe la ubicación «${nombre}»`,
    calculadas,
  )
  nombresUnicos(
    documento.personas.map((p, i) => ({ ruta: `personas[${i}].nombre`, nombre: p.nombre })),
    (nombre) => `Ya existe «${nombre}» en Personas y entidades`,
  )
  nombresUnicos(
    documento.hechizos.map((h, i) => ({ ruta: `hechizos[${i}].nombre`, nombre: h.nombre })),
    (nombre) => `Ya tienes el hechizo «${nombre}»`,
  )
  // El mercado local lleva a propósito el nombre de su asentamiento (4.5), así que no choca con él ni con otro local:
  // la unicidad se comprueba sobre los mercados que no son locales, contra los asentamientos y contra los locales.
  const ocupadosPorMercados = new Set<string>()
  for (const a of asentamientos) {
    ocupadosPorMercados.add(normalizarNombre(a.nombre))
  }
  for (const m of documento.mercados) {
    if (m.localDe !== undefined) {
      ocupadosPorMercados.add(normalizarNombre(m.nombre))
    }
  }
  nombresUnicos(
    documento.mercados.flatMap((m, i) =>
      m.localDe === undefined ? [{ ruta: `mercados[${i}].nombre`, nombre: m.nombre }] : [],
    ),
    (nombre) => `Ya existe el mercado «${nombre}»`,
    ocupadosPorMercados,
  )
  for (const dominio of asentamientos) {
    nombresUnicos(
      documento.tiposLocal.flatMap((t, i) =>
        t.dominioId === dominio.id ? [{ ruta: `tiposLocal[${i}].nombre`, nombre: t.nombre }] : [],
      ),
      (nombre) => `Ya existe el tipo de local «${nombre}» en «${dominio.id}»`,
    )
  }

  // ---- Nombres reservados por los filtros (§6.6) --------------------------
  const todosLosNombres: NombreEnRuta[] = [
    ...nombresDeOpcion,
    ...catalogos.recursos.map((r, i) => ({ ruta: `catalogos.recursos[${i}].nombre`, nombre: r.nombre })),
    ...documento.ubicaciones.map((u, i) => ({ ruta: `ubicaciones[${i}].nombre`, nombre: u.nombre })),
    ...documento.personas.map((p, i) => ({ ruta: `personas[${i}].nombre`, nombre: p.nombre })),
    ...documento.hechizos.map((h, i) => ({ ruta: `hechizos[${i}].nombre`, nombre: h.nombre })),
    ...documento.mercados.map((m, i) => ({ ruta: `mercados[${i}].nombre`, nombre: m.nombre })),
    ...documento.tiposLocal.map((t, i) => ({ ruta: `tiposLocal[${i}].nombre`, nombre: t.nombre })),
  ]
  for (const n of todosLosNombres) {
    if (esNombreReservado(n.nombre)) {
      anota(n.ruta, 'Ese nombre lo usa el filtro')
    }
  }

  // ---- Claves repetidas dentro de un registro o de una colección ----------
  documento.mercados.forEach((m, i) => {
    sinRepetir(
      m.precios.map((p, j) => ({ ruta: `mercados[${i}].precios[${j}].recursoId`, clave: p.recursoId })),
      (e) => `El mercado «${m.id}» repite el precio de «${e.clave}»`,
    )
  })
  documento.localesComerciales.forEach((l, i) => {
    sinRepetir(
      l.producciones.map((p, j) => ({
        ruta: `localesComerciales[${i}].producciones[${j}].mes`,
        clave: textoDeMes(p.mes),
      })),
      (e) => `El local «${l.id}» anota dos veces el mes «${e.clave}»`,
    )
  })
  documento.edificios.forEach((e, i) => {
    const vistas = new Set<string>()
    e.producciones.forEach((p, j) => {
      const clave = `${p.recursoId}|${claveRecurrencia(p.recurrencia)}`
      if (vistas.has(clave)) {
        anota(`edificios[${i}].producciones[${j}]`, `«${e.id}» ya produce «${p.recursoId}» con esa misma frecuencia`)
      } else {
        vistas.add(clave)
      }
    })
  })
  const animalesVistos = new Set<string>()
  documento.animales.forEach((a, i) => {
    const clave = `${a.dominioId}|${a.tipoId}|${a.genero}`
    if (animalesVistos.has(clave)) {
      anota(`animales[${i}]`, `«${a.dominioId}» ya tiene una fila de ese tipo y ese género`)
    } else {
      animalesVistos.add(clave)
    }
  })
  const existenciasVistas = new Set<string>()
  documento.existencias.forEach((x, i) => {
    const clave = `${x.dominioId}|${x.recursoId}`
    if (existenciasVistas.has(clave)) {
      anota(`existencias[${i}]`, `El almacén de «${x.dominioId}» repite la fila de «${x.recursoId}»`)
    } else {
      existenciasVistas.add(clave)
    }
  })
  const rutasVistas = new Set<string>()
  documento.rutas.forEach((ru, i) => {
    const ida = `${ru.origenId}|${ru.destino.tipo}|${ru.destino.id}`
    const vuelta = ru.destino.tipo === 'asentamiento' ? `${ru.destino.id}|asentamiento|${ru.origenId}` : ida
    if (rutasVistas.has(ida) || rutasVistas.has(vuelta)) {
      anota(`rutas[${i}]`, `Ya hay una ruta entre «${ru.origenId}» y «${ru.destino.id}»`)
    } else {
      rutasVistas.add(ida)
    }
  })
  sinRepetir(
    documento.deudas.flatMap((d, i) =>
      d.impago && d.estado !== 'saldada' && d.origenImpago !== undefined
        ? [{ ruta: `deudas[${i}]`, clave: `${d.origenImpago.tipo}|${d.origenImpago.id}` }]
        : [],
    ),
    () => 'Hay dos deudas de impago abiertas del mismo origen',
  )

  return problemas
}
```

Ejecuta la prueba y mírala pasar:

```bash
npx vitest run src/dominio/validacion/unicidades.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  11:14:02
   Duration  487ms (transform 56%, import 29%, worker 8%, tests 5%)
```

- [ ] **Paso 6: Ampliar la prueba de `coherencia.ts`**

Se le añaden cinco pruebas al archivo del paso 1: `problemasDeZod` y `detalleDeProblemas` con las rutas y las dos líneas; el `introducido` que no cuadra con su `base`; la fecha actual que no cuadra con los avances y el snapshot que no es del último; los estados y las fechas; y `validarCopia`, que junta las tres validaciones y prefija las rutas del snapshot.

**Sustituye** `src/dominio/validacion/coherencia.test.ts` por este contenido (el bloque «la forma de los errores de Zod 4.6.5» del paso 1 se conserva tal cual):

```ts
import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { detalleDeProblemas, problemasDeZod, validarCoherenciaInterna, validarCopia } from './coherencia'

/** Un esquema con la misma forma que los del modelo, para provocar errores de Zod de verdad. */
const EsquemaFechaDePrueba = z.object({ anio: z.int(), mes: z.int(), dia: z.int() }).check((ctx) => {
  if (ctx.value.mes === 4 && ctx.value.dia > 30) {
    ctx.issues.push({ code: 'custom', message: `Abril de ${ctx.value.anio} tiene 30 días`, input: ctx.value })
  }
})

const EsquemaDePrueba = z.object({
  partida: z.object({ nombre: z.string() }),
  movimientos: z.array(z.object({ id: z.string(), fecha: EsquemaFechaDePrueba })),
})

/** Un documento con una fecha imposible en el segundo movimiento. */
function conFechaImposible(): unknown {
  return {
    partida: { nombre: 'La Sombra del Este' },
    movimientos: [
      { id: 'mov.1', fecha: { anio: 1640, mes: 4, dia: 12 } },
      { id: 'mov.2', fecha: { anio: 1640, mes: 4, dia: 31 } },
    ],
  }
}

/** Los catálogos mínimos que acompañan a una copia: una categoría y el recurso protegido «Víveres». */
function catalogosMinimos(): CatalogosEnCopia {
  return {
    opciones: [{ id: 'cat.otros', nombre: 'Otros', propia: false, lista: 'categorias', grupo: 'otros' }],
    recursos: [
      { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false },
    ],
  }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Un movimiento suelto, para colgarle lo que cada prueba necesite. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.otros',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

/** El estado que guarda un snapshotPrevio: el documento sin su lista de avances (§8, decisión 4). */
function estadoDelSnapshot(): EstadoPartida {
  const { avances, ...estado } = documentoMinimo()
  void avances
  return estado
}

describe('la forma de los errores de Zod 4.6.5', () => {
  it('issue.path es un array de claves y de índices, e issue.code dice qué falló', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    expect(resultado.success).toBe(false)
    if (resultado.success) {
      return
    }
    expect(resultado.error.issues).toHaveLength(1)
    const issue = resultado.error.issues[0]
    expect(issue.path).toEqual(['movimientos', 1, 'fecha'])
    expect(issue.path.map((tramo) => typeof tramo)).toEqual(['string', 'number', 'string'])
    expect(issue.code).toBe('custom')
    expect(issue.message).toBe('Abril de 1640 tiene 30 días')
  })

  it('un error de la raíz trae el path vacío y el código invalid_type', () => {
    const resultado = EsquemaDePrueba.safeParse('esto no es un objeto')
    expect(resultado.success).toBe(false)
    if (resultado.success) {
      return
    }
    expect(resultado.error.issues[0].path).toEqual([])
    expect(resultado.error.issues[0].code).toBe('invalid_type')
  })

  it('z.prettifyError escribe «→ at», en inglés: por eso el detalle no lo usa', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    if (resultado.success) {
      throw new Error('el esquema debía rechazarlo')
    }
    expect(z.prettifyError(resultado.error)).toContain('→ at movimientos[1].fecha')
  })
})

describe('problemasDeZod y detalleDeProblemas', () => {
  it('arma la ruta con puntos e índices y escribe las dos líneas en castellano', () => {
    const resultado = EsquemaDePrueba.safeParse(conFechaImposible())
    if (resultado.success) {
      throw new Error('el esquema debía rechazarlo')
    }
    const problemas = problemasDeZod(resultado.error)
    expect(problemas).toEqual([{ ruta: 'movimientos[1].fecha', mensaje: 'Abril de 1640 tiene 30 días' }])
    expect(detalleDeProblemas(problemas)).toBe('✖ Abril de 1640 tiene 30 días\n  → en movimientos[1].fecha')
    const raiz = EsquemaDePrueba.safeParse('esto no es un objeto')
    if (raiz.success) {
      throw new Error('el esquema debía rechazarlo')
    }
    expect(problemasDeZod(raiz.error)[0].ruta).toBe('la copia')
    expect(
      detalleDeProblemas([
        { ruta: 'movimientos[3].categoriaId', mensaje: 'No existe la categoría «cat.posadas»' },
        { ruta: 'edificios[0].producciones[1].recursoId', mensaje: 'No existe el recurso «recurso.cal»' },
      ]),
    ).toBe(
      '✖ No existe la categoría «cat.posadas»\n  → en movimientos[3].categoriaId\n' +
        '✖ No existe el recurso «recurso.cal»\n  → en edificios[0].producciones[1].recursoId',
    )
  })
})

describe('validarCoherenciaInterna', () => {
  it('pilla lo tecleado que no cuadra con el importe guardado, con las equivalencias de la partida', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      // 6 mp son 60.000 mh con las equivalencias por defecto, no 70.000.
      {
        ...movimientoBase('mov.1', 'dom.bree'),
        importe: { base: 70000, introducido: { cantidad: '6', moneda: 'mp' } },
      },
      {
        ...movimientoBase('mov.2', 'dom.bree'),
        importe: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
      },
      // En un gasto se compara el valor absoluto: −0,6 mo también cuadra.
      {
        ...movimientoBase('mov.3', 'dom.bree'),
        tipo: 'gasto',
        importe: { base: -60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'movimientos[0].importe', mensaje: 'Lo tecleado («6 mp») no cuadra con el importe guardado' },
    ])
  })

  it('pilla la fecha actual que no cuadra con los avances y el snapshot que no es del último', () => {
    const documento = documentoMinimo()
    const snapshot = estadoDelSnapshot()
    documento.avances = [
      { ...documento.avances[0], id: 'av.1', snapshotPrevio: snapshot },
      {
        id: 'av.2',
        desde: { anio: 1640, mes: 4, dia: 12 },
        hasta: { anio: 1640, mes: 4, dia: 20 },
        aplicadoEl: '2026-09-17T10:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'partida.fechaActual', mensaje: 'La fecha actual no cuadra con los avances' },
      { ruta: 'avances[0].snapshotPrevio', mensaje: 'Solo el último avance guarda la copia de la partida' },
    ])
  })

  it('pilla los estados y las fechas que no cuadran con la fecha actual', () => {
    const documento = documentoMinimo()
    documento.movimientos = [
      { ...movimientoBase('mov.futuro', 'dom.bree'), fecha: { anio: 1640, mes: 5, dia: 1 }, programado: false },
    ]
    documento.obras = [
      {
        id: 'obra.granero',
        dominioId: 'dom.bree',
        nombre: 'Granero nuevo',
        estado: 'terminada',
        coste: { base: 1000000 },
        materiales: { 'recurso.viveres': 10 },
        inicio: { anio: 1640, mes: 4, dia: 10 },
        diasTotales: 30,
        efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.viveres', valor: 100 },
      },
    ]
    documento.personas = [{ id: 'persona.gremio-bree', nombre: 'Gremio de mercaderes de Bree' }]
    documento.deudas = [
      {
        id: 'deuda.gremio',
        dominioId: 'dom.tharan',
        sentido: 'debo',
        contraparteId: 'persona.gremio-bree',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        principal: { base: 4200000 },
        interesPct: 0,
        vencimiento: { anio: 1640, mes: 6, dia: 1 },
        estado: 'vencida',
        impago: false,
        pagos: [],
        devengos: [],
      },
    ]
    documento.entradasAlmacen = [
      {
        id: 'ent.1',
        dominioId: 'dom.bree',
        recursoId: 'recurso.viveres',
        cantidad: 30,
        operacion: 'recepcion',
        fecha: { anio: 1640, mes: 4, dia: 1 },
        aplicada: false,
      },
    ]
    expect(validarCoherenciaInterna(documento)).toEqual([
      { ruta: 'movimientos[0].programado', mensaje: 'Un movimiento con fecha futura tiene que estar programado' },
      { ruta: 'obras[0]', mensaje: 'El estado de la obra «obra.granero» no cuadra con sus fechas' },
      {
        ruta: 'deudas[0].vencimiento',
        mensaje: 'La deuda con «persona.gremio-bree» está marcada vencida y no ha vencido',
      },
      { ruta: 'entradasAlmacen[0].fecha', mensaje: 'Una entrada sin aplicar tiene fecha pasada' },
    ])
  })
})

describe('validarCopia', () => {
  it('no da nada con el documento mínimo y prefija los problemas del snapshot del último avance', () => {
    expect(validarCopia(documentoMinimo(), catalogosMinimos())).toEqual([])
    expect(validarCoherenciaInterna(documentoMinimo())).toEqual([])
    const documento = documentoMinimo()
    const snapshot = estadoDelSnapshot()
    snapshot.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.posadas' }]
    documento.avances = [{ ...documento.avances[0], snapshotPrevio: snapshot }]
    expect(validarCopia(documento, catalogosMinimos())).toEqual([
      {
        ruta: 'avances[0].snapshotPrevio.movimientos[0].categoriaId',
        mensaje: 'No existe la categoría «cat.posadas»',
      },
    ])
  })
})
```

Ejecútala:

```bash
npx vitest run src/dominio/validacion/coherencia.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./coherencia`, que todavía no existe. Las tres pruebas del paso 1 tampoco corren, porque el archivo entero no llega a cargarse:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/validacion/coherencia.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/validacion/coherencia.test.ts [ src/dominio/validacion/coherencia.test.ts ]
Error: Cannot find module './coherencia' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/validacion/coherencia.test.ts
 ❯ src/dominio/validacion/coherencia.test.ts:6:1
      4| import type { DocumentoPartida, EstadoPartida } from '../modelo/docum…
      5| import type { Movimiento } from '../modelo/movimientos'
      6| import { detalleDeProblemas, problemasDeZod, validarCoherenciaInterna…
       | ^
      7|
      8| /** Un esquema con la misma forma que los del modelo, para provocar e…


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 7: Implementar `coherencia.ts`**

Dos detalles del diseño que hay que respetar:

1. El archivo parte las comprobaciones en dos funciones internas. `problemasDelEstado` lleva §4.3, §4.5 y las reglas de §4.4 que solo miran la fecha actual; `problemasDeLosAvances` lleva las cuatro que miran la lista de avances. `validarCoherenciaInterna` devuelve las dos, y `validarCopia` llama **solo a la primera** sobre el `snapshotPrevio`: un snapshot es un `EstadoPartida` sin lista de avances, y su `fechaActual` es la del avance anterior, así que la regla «sin avances, `fechaActual` es igual a `fechaInicial`» no le vale (§4.6). La firma exportada es exactamente la del contrato.
2. La comprobación de `introducido` (§4.3) recorre el documento entero buscando objetos con `base` e `introducido` en vez de enumerar los treinta y tantos campos de tipo `Importe` del modelo. El recorrido **se salta la clave `snapshotPrevio`**, que `validarCopia` valida aparte con su propio prefijo.

Crea `src/dominio/validacion/coherencia.ts` con este contenido:

```ts
import type * as z from 'zod'
import { ANIO_MAXIMO, compararFechas, sumarDias, type Fecha } from '../calendario/fecha'
import { aBase, type Importe } from '../dinero/importe'
import type { CatalogosEnCopia } from '../modelo/catalogos'
import type { AnioMes } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { validarReferencias, type ProblemaDeCoherencia } from './referencias'
import { validarUnicidades } from './unicidades'

/** Número de mes absoluto, para comparar AnioMes. */
function numeroDeMes(mes: AnioMes): number {
  return mes.anio * 12 + mes.mes
}

/** El mes de una fecha. */
function mesDe(fecha: Fecha): AnioMes {
  return { anio: fecha.anio, mes: fecha.mes }
}

/**
 * Recorre el estado y llama a `visitar` en cada Importe con «introducido», con su ruta.
 * Se salta `snapshotPrevio`: validarCopia lo valida aparte, con su propio prefijo (4.6).
 */
function recorrerImportes(valor: unknown, ruta: string, visitar: (ruta: string, importe: Importe) => void): void {
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => recorrerImportes(v, `${ruta}[${i}]`, visitar))
    return
  }
  if (valor === null || typeof valor !== 'object') {
    return
  }
  const objeto = valor as Record<string, unknown>
  if (typeof objeto.base === 'number' && typeof objeto.introducido === 'object' && objeto.introducido !== null) {
    visitar(ruta, objeto as unknown as Importe)
    return
  }
  for (const [clave, v] of Object.entries(objeto)) {
    if (clave === 'snapshotPrevio') {
      continue
    }
    recorrerImportes(v, ruta === '' ? clave : `${ruta}.${clave}`, visitar)
  }
}

/** Las comprobaciones que valen también para un snapshotPrevio, que no tiene lista de avances (4.3, 4.4 y 4.5). */
function problemasDelEstado(documento: DocumentoPartida): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }
  const exige = (bien: boolean, ruta: string, mensaje: string): void => {
    if (!bien) {
      anota(ruta, mensaje)
    }
  }
  const partida = documento.partida
  const hoy = partida.fechaActual

  // ---- 4.3 Importes enteros seguros y equivalencias -----------------------
  documento.cajas.forEach((caja, i) => {
    const suma = documento.movimientos.reduce(
      (total, m) => (m.dominioId === caja.dominioId ? total + Math.abs(m.importe.base) : total),
      Math.abs(caja.saldoInicial.base),
    )
    exige(
      suma <= Number.MAX_SAFE_INTEGER,
      `cajas[${i}]`,
      `Los importes de «${caja.dominioId}» se salen del rango entero exacto`,
    )
  })
  recorrerImportes(documento, '', (ruta, importe) => {
    const introducido = importe.introducido
    if (introducido === undefined) {
      return
    }
    let cuadra = false
    try {
      cuadra = aBase(introducido.cantidad, introducido.moneda, partida.equivalencias) === Math.abs(importe.base)
    } catch {
      cuadra = false
    }
    exige(
      cuadra,
      ruta,
      `Lo tecleado («${introducido.cantidad} ${introducido.moneda}») no cuadra con el importe guardado`,
    )
  })

  // ---- 4.4 Fechas (las que no miran la lista de avances) ------------------
  documento.dominios.forEach((d, i) => {
    if (d.tipo !== 'asentamiento') {
      return
    }
    exige(
      compararFechas(d.alta, hoy) <= 0 && compararFechas(d.alta, partida.fechaInicial) >= 0,
      `dominios[${i}].alta`,
      `El alta de «${d.id}» se sale de la partida`,
    )
  })
  documento.movimientos.forEach((m, i) => {
    exige(
      compararFechas(m.fecha, hoy) <= 0 || m.programado,
      `movimientos[${i}].programado`,
      'Un movimiento con fecha futura tiene que estar programado',
    )
  })
  documento.intentos.forEach((it, i) => {
    exige(
      compararFechas(it.fecha, hoy) <= 0,
      `intentos[${i}].fecha`,
      `El intento de «${it.hechizoId}» es posterior a la fecha actual`,
    )
  })
  documento.hechizos.forEach((h, i) => {
    const aprendidoEl = h.aprendidoEl
    if (aprendidoEl === undefined) {
      return
    }
    exige(
      compararFechas(aprendidoEl, hoy) <= 0,
      `hechizos[${i}].aprendidoEl`,
      '«Aprendido el» es posterior a la fecha actual',
    )
    const posterior = documento.intentos.some((it) => it.hechizoId === h.id && compararFechas(it.fecha, aprendidoEl) > 0)
    exige(!posterior, `hechizos[${i}].aprendidoEl`, '«Aprendido el» es anterior al último intento')
  })
  documento.pergaminos.forEach((p, i) => {
    if (p.consumidoEl !== undefined) {
      exige(
        compararFechas(p.consumidoEl, hoy) <= 0,
        `pergaminos[${i}].consumidoEl`,
        `El pergamino «${p.id}» se consumió después de la fecha actual`,
      )
    }
  })
  documento.localesComerciales.forEach((l, i) => {
    const primerTramo = l.cambiosEstado[0]
    const cuadra =
      compararFechas(l.alta, hoy) <= 0 &&
      primerTramo !== undefined &&
      compararFechas(primerTramo.desde, l.alta) >= 0 &&
      compararFechas(primerTramo.desde, hoy) <= 0 &&
      numeroDeMes(l.cobradoHasta) < numeroDeMes(mesDe(hoy)) &&
      numeroDeMes(l.cobradoHasta) >= numeroDeMes(mesDe(l.alta)) - 1
    exige(cuadra, `localesComerciales[${i}]`, `El estado o el cobro de «${l.id}» no cuadran con su alta`)
    l.producciones.forEach((p, j) => {
      exige(
        numeroDeMes(p.mes) <= numeroDeMes(mesDe(hoy)) && numeroDeMes(p.mes) >= numeroDeMes(mesDe(l.alta)),
        `localesComerciales[${i}].producciones[${j}].mes`,
        `El local «${l.id}» anota un mes que no le toca`,
      )
    })
  })
  documento.obras.forEach((o, i) => {
    const inicio = o.inicio
    if (inicio === undefined) {
      return
    }
    const fin = sumarDias(inicio, o.diasTotales - 1)
    let cuadra = fin.anio <= ANIO_MAXIMO
    if (o.estado === 'programada') {
      cuadra = cuadra && compararFechas(inicio, hoy) > 0
    } else if (o.estado === 'enCurso') {
      cuadra = cuadra && compararFechas(inicio, hoy) <= 0 && compararFechas(fin, hoy) >= 0
    } else if (o.estado === 'terminada') {
      cuadra = cuadra && compararFechas(fin, hoy) <= 0
    }
    exige(cuadra, `obras[${i}]`, `El estado de la obra «${o.id}» no cuadra con sus fechas`)
  })
  documento.caravanas.forEach((c, i) => {
    let cuadra = true
    if (c.estado === 'programada') {
      cuadra = compararFechas(c.salida, hoy) > 0
    } else if (c.estado === 'enRuta') {
      cuadra = compararFechas(c.salida, hoy) <= 0
    } else {
      cuadra = compararFechas(c.vuelta, hoy) <= 0
    }
    exige(cuadra, `caravanas[${i}]`, `El estado de la caravana «${c.id}» no cuadra con sus fechas`)
  })
  documento.deudas.forEach((d, i) => {
    if (d.estado !== 'vencida') {
      return
    }
    exige(
      d.vencimiento !== undefined && compararFechas(d.vencimiento, hoy) < 0,
      `deudas[${i}].vencimiento`,
      `La deuda con «${d.contraparteId}» está marcada vencida y no ha vencido`,
    )
  })
  documento.entradasAlmacen.forEach((e, i) => {
    if (e.aplicada) {
      return
    }
    exige(compararFechas(e.fecha, hoy) > 0, `entradasAlmacen[${i}].fecha`, 'Una entrada sin aplicar tiene fecha pasada')
  })

  // ---- 4.5 Coherencias entre registros ------------------------------------
  const movimientos = new Map(documento.movimientos.map((m) => [m.id, m]))
  const transferencias = new Map(documento.transferencias.map((t) => [t.id, t]))
  documento.movimientos.forEach((m, i) => {
    if (m.tipo !== 'transferencia' || m.vinculo === undefined) {
      return
    }
    const t = transferencias.get(m.vinculo.id)
    exige(
      t !== undefined && (t.movimientoSaleId === m.id || t.movimientoEntraId === m.id),
      `movimientos[${i}].vinculo`,
      `La transferencia «${m.vinculo.id}» y sus movimientos no se apuntan entre sí`,
    )
  })
  documento.transferencias.forEach((t, i) => {
    const sale = movimientos.get(t.movimientoSaleId)
    const entra = movimientos.get(t.movimientoEntraId)
    const cuadra =
      sale !== undefined &&
      entra !== undefined &&
      compararFechas(sale.fecha, t.fecha) === 0 &&
      compararFechas(entra.fecha, t.fecha) === 0 &&
      sale.importe.base === -t.importe.base &&
      entra.importe.base === t.importe.base
    exige(cuadra, `transferencias[${i}]`, `La transferencia «${t.id}» no cuadra con sus movimientos`)
  })
  documento.deudas.forEach((d, i) => {
    const cargos = d.cargos
    if (!d.impago || cargos === undefined) {
      return
    }
    const suma = cargos.reduce((total, c) => total + c.importe.base, 0)
    exige(suma === d.principal.base, `deudas[${i}].principal`, `La deuda de impago «${d.id}» no cuadra con sus cargos`)
  })
  const objetos = new Map(documento.objetos.map((o) => [o.id, o]))
  documento.pergaminos.forEach((p, i) => {
    if (p.objetoInventarioId === undefined) {
      return
    }
    const objeto = objetos.get(p.objetoInventarioId)
    if (objeto === undefined) {
      return
    }
    const ruta = `pergaminos[${i}].objetoInventarioId`
    if (p.estado === 'consumido' || p.estado === 'perdido') {
      exige(objeto.archivado === p.estado, ruta, `El objeto del pergamino «${p.id}» no está archivado`)
    } else if (p.estado === 'vendido') {
      exige(objeto.archivado === 'vendido', ruta, `El objeto del pergamino «${p.id}» no está archivado como vendido`)
    }
    exige(
      objeto.archivado !== undefined || objeto.cantidad === 1,
      ruta,
      `El objeto del pergamino «${p.id}» no tiene 1 unidad`,
    )
  })
  const dominios = new Map(documento.dominios.map((d) => [d.id, d]))
  documento.mercados.forEach((m, i) => {
    const localDe = m.localDe
    if (localDe === undefined) {
      return
    }
    const asentamiento = dominios.get(localDe)
    exige(
      asentamiento !== undefined && asentamiento.nombre === m.nombre,
      `mercados[${i}].nombre`,
      `El mercado local de «${localDe}» no lleva su nombre`,
    )
  })
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
    if (regla.tipo === 'locales' && m.detalleLocales !== undefined) {
      const suma = m.detalleLocales.reduce((total, d) => total + d.impuesto.base, 0)
      exige(
        suma === m.importe.base,
        `movimientos[${i}].detalleLocales`,
        `El cobro de locales «${m.id}» no cuadra con su detalle`,
      )
    }
    if ((regla.tipo === 'salarios' || regla.tipo === 'soldadas') && m.detalleTrabajo !== undefined) {
      const suma = m.detalleTrabajo.reduce((total, d) => total + d.importe.base, 0)
      exige(
        suma === Math.abs(m.importe.base),
        `movimientos[${i}].detalleTrabajo`,
        `El pago agrupado «${m.id}» no cuadra con su detalle`,
      )
    }
  })

  return problemas
}

/** Las comprobaciones que miran la lista de avances (4.4); un snapshotPrevio, que no la tiene, no pasa por aquí. */
function problemasDeLosAvances(documento: DocumentoPartida): ProblemaDeCoherencia[] {
  const problemas: ProblemaDeCoherencia[] = []
  const anota = (ruta: string, mensaje: string): void => {
    problemas.push({ ruta, mensaje })
  }
  const partida = documento.partida
  const avances = documento.avances
  const ultimo = avances[avances.length - 1]
  const esperada = ultimo === undefined ? partida.fechaInicial : ultimo.hasta
  if (compararFechas(partida.fechaActual, esperada) !== 0) {
    anota('partida.fechaActual', 'La fecha actual no cuadra con los avances')
  }
  avances.forEach((a, i) => {
    const anterior = avances[i - 1]
    const enOrden =
      compararFechas(a.desde, a.hasta) < 0 &&
      (anterior === undefined || (compararFechas(anterior.hasta, a.desde) <= 0 && anterior.aplicadoEl <= a.aplicadoEl))
    if (!enOrden) {
      anota(`avances[${i}]`, 'Los avances no van en orden')
    }
    if (a.snapshotPrevio !== undefined && i !== avances.length - 1) {
      anota(`avances[${i}].snapshotPrevio`, 'Solo el último avance guarda la copia de la partida')
    }
  })
  if (avances.length > 0 && compararFechas(avances[0].desde, partida.fechaInicial) < 0) {
    anota('avances[0].desde', 'Un avance empieza antes que la partida')
  }
  return problemas
}

/** Importes enteros seguros, «introducido» que cuadra, fechas, recurrencias y estados (§6.1, decisión 14). */
export function validarCoherenciaInterna(documento: DocumentoPartida): ProblemaDeCoherencia[] {
  return [...problemasDelEstado(documento), ...problemasDeLosAvances(documento)]
}

/** Las tres, sobre el documento y sobre el snapshotPrevio del último avance; es lo que llama analizarCopia (4.6). */
export function validarCopia(documento: DocumentoPartida, catalogos: CatalogosEnCopia): ProblemaDeCoherencia[] {
  const problemas = [
    ...validarReferencias(documento, catalogos),
    ...validarUnicidades(documento, catalogos),
    ...validarCoherenciaInterna(documento),
  ]
  const ultimo = documento.avances.length - 1
  const snapshot = ultimo < 0 ? undefined : documento.avances[ultimo].snapshotPrevio
  if (snapshot === undefined) {
    return problemas
  }
  const comoDocumento: DocumentoPartida = { ...snapshot, avances: [] }
  const delSnapshot = [
    ...validarReferencias(comoDocumento, catalogos),
    ...validarUnicidades(comoDocumento, catalogos),
    ...problemasDelEstado(comoDocumento),
  ]
  return [
    ...problemas,
    ...delSnapshot.map((p) => ({ ruta: `avances[${ultimo}].snapshotPrevio.${p.ruta}`, mensaje: p.mensaje })),
  ]
}

/** La ruta de un error de Zod con la notación de EsquemaEstadoPartida: «partida.movimientos[1].fecha». */
function rutaDeIssue(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return 'la copia'
  }
  return path.reduce<string>((ruta, tramo) => {
    if (typeof tramo === 'number') {
      return `${ruta}[${tramo}]`
    }
    return ruta === '' ? String(tramo) : `${ruta}.${String(tramo)}`
  }, '')
}

/** Los errores de Zod puestos en la misma forma, para que el detalle se lea igual venga de donde venga. */
export function problemasDeZod(error: z.ZodError): ProblemaDeCoherencia[] {
  return error.issues.map((issue) => ({ ruta: rutaDeIssue(issue.path), mensaje: issue.message }))
}

/** El detalle técnico plegado: «✖ mensaje» y «  → en ruta» por cada problema (decisión propia 29). */
export function detalleDeProblemas(problemas: readonly ProblemaDeCoherencia[]): string {
  return problemas.map((p) => `✖ ${p.mensaje}\n  → en ${p.ruta}`).join('\n')
}
```

Ejecuta la prueba y mírala pasar:

```bash
npx vitest run src/dominio/validacion/coherencia.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  11:21:47
   Duration  563ms (transform 52%, import 33%, worker 8%, tests 5%)
```

- [ ] **Paso 8: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que una unión discriminada del modelo no se ha estrechado bien (por ejemplo, leer `efecto.tipoId` en una rama de `EfectoObra` que no lo tiene) y que `import type * as z from 'zod'` compila con `verbatimModuleSyntax`; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 444 pruebas en 35 archivos. La tarea 12 dejó 416 pruebas en 32 archivos, y esta tarea trae **28 nuevas**: 9 de `referencias.test.ts`, 8 de `unicidades.test.ts`, 8 de `coherencia.test.ts` y **tres más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también los tres archivos de `src/dominio/validacion/`.

```text
 Test Files  35 passed (35)
      Tests  444 passed (444)
```

Si `pureza.test.ts` falla por `coherencia.ts`, es que su expresión de prohibidos todavía incluye `zod`: la tarea 1 la deja **sin** `zod` a propósito (decisión 15 y decisión propia 1 de `contrato-modelo.md`), porque el esquema es la fuente de verdad del modelo y vive en el dominio.

- [ ] **Paso 9: Commit**

```bash
git add src/dominio/validacion
git commit -m "feat(validacion): referencias, unicidades y coherencia de una copia" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/validacion/coherencia.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/validacion/coherencia.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/validacion/referencias.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/validacion/referencias.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/validacion/unicidades.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/validacion/unicidades.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 5b71e93] feat(validacion): referencias, unicidades y coherencia de una copia
 6 files changed, 2224 insertions(+)
 create mode 100644 src/dominio/validacion/coherencia.test.ts
 create mode 100644 src/dominio/validacion/coherencia.ts
 create mode 100644 src/dominio/validacion/referencias.test.ts
 create mode 100644 src/dominio/validacion/referencias.ts
 create mode 100644 src/dominio/validacion/unicidades.test.ts
 create mode 100644 src/dominio/validacion/unicidades.ts
```

---

### Tarea 14 · Exportar copia

La copia de seguridad es «una partida completa» dentro de un sobre con la marca de la app y su `versionFormato` (§6.1, decisión 6). Esta tarea escribe las dos mitades: la pura, `src/dominio/copia/sobre.ts`, que define el sobre, elige qué opciones de catálogo viajan con él y lo pasa a texto; y la que toca la base, `src/datos/copia/exportar.ts`, que lee la partida y el catálogo, arma el archivo y anota `exportadaEl` en el resumen de P0.

Depende de la tarea 11 (la siembra y la lectura del catálogo: `leerCatalogo`) y de la tarea 12, que es la que cierra el orden del plan; del modelo usa `EsquemaDocumentoPartida` (tarea 6), `EsquemaCatalogosEnCopia` (tarea 6) y `VERSION_FORMATO` (tarea 3), y de la capa de datos, `leerPartida` (tarea 10). La partida de ejemplo no existe hasta la tarea 20, así que las pruebas arman sus datos a mano, como en las tareas 12 y 13.

**Reglas de la especificación que implementa:**

- **La copia es una partida completa (§6.1).** «La copia es una partida completa con versionFormato.» El sobre es `{ app: 'gestion-aldeas', versionFormato, exportadaEl, partida: <documento>, catalogos: { opciones[], recursos[] } }` (decisión 6). `app` distingue una copia de cualquier otro JSON y `versionFormato` decide si se migra o se rechaza al importarla (tarea 15).
- **Qué catálogos viajan (§6.1).** «Opciones de catálogo: la copia lleva las opciones que usan sus registros ({ id, nombre, grupo, plural o unidades, propia }), también las de la app, por si se renombraron.» Por eso la copia **no** lleva `borrada` ni `protegida`/`protegido`: al importar mandan los de esta tablet y una opción borrada se reactiva (decisión 7). Los esquemas de lo que viaja (`EsquemaOpcionEnCopia`, `EsquemaRecursoEnCopia`, `EsquemaCatalogosEnCopia`) ya están escritos en `modelo/catalogos.ts` desde la tarea 6.
- **El snapshot también cuenta (decisión 4 y decisión 6).** La copia «lleva el último avance con su `snapshotPrevio` y las opciones de catálogo que usan el estado y el snapshot». Por eso `catalogosUsados` recorre los **20 campos de catálogo** del estado y los mismos 20 dentro de `avances[].snapshotPrevio`.
- **Exportación determinista (`contrato-modelo.md` §3.4).** Dos exportaciones del mismo estado tienen que dar el mismo archivo: el sobre se escribe con las claves en orden fijo (`app`, `versionFormato`, `exportadaEl`, `partida`, `catalogos`), el documento con las claves de `EsquemaEstadoPartida` y `avances` al final, y cada colección ordenada por su clave comparando las cadenas con `<`, **no** con `localeCompare`, que depende de la configuración regional.
- **Exportar no cambia la partida (decisión 9).** «La “última copia exportada” se guarda junto al resumen de cada partida, fuera del estado.» `exportarCopia` escribe `exportadaEl` en la fila de `resumenes` y no toca `actualizada` ni `cambiosDesdeUltimoAvance`: exportar no es cambiar.
- **Fuera de la transacción lo que no es IndexedDB (`tecnica.md` §6.2).** Dentro de `db.transaction` solo se lee de las tablas; armar el sobre y serializarlo se hace después, ya fuera, para que no salte `PrematureCommitError`.
- **El dominio es puro (plan de la fase 1).** `src/dominio/copia/sobre.ts` no importa Dexie, ni React, ni APIs del navegador; Zod sí (decisión 15). La prueba de pureza de la tarea 1 recorre también este módulo nuevo.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/copia/sobre.ts`, `src/datos/copia/exportar.ts`
- Prueba: `src/dominio/copia/sobre.test.ts`, `src/datos/copia/exportar.test.ts`

Las dos carpetas, `src/dominio/copia/` y `src/datos/copia/`, son nuevas: `git add` las crea al añadir sus archivos.

- [ ] **Paso 1: Escribir la prueba que falla de `sobre.ts`**

La prueba repite a propósito el constructor de datos de la tarea 13 (`documentoMinimo` y `movimientoBase`): la partida de ejemplo no existe hasta la tarea 20 y el contrato no da ningún archivo de ayuda compartido para las pruebas del dominio. `documentoConCatalogos()` lo amplía con **un registro de cada uno de los 20 campos de catálogo** del contrato (`contrato-datos.md` §2.9) y con un `snapshotPrevio` que usa una categoría que el estado no usa, para que se vea que el snapshot también se recorre.

Qué comprueba cada bloque:
- `catalogosUsados`: los 20 campos, el snapshot, sin repetir y en orden; y que el id de una **categoría de coste** de un evento (`salarios`) no se recoge, porque es una clave fija y no una opción de catálogo.
- `armarCopia`: solo viajan las opciones y los recursos que usan los registros, sin `borrada` ni `protegida`, y ordenados; y el sobre entero pasa `EsquemaSobreCopia`.
- `serializarCopia`: el mismo texto dos veces, aunque las claves del sobre y las colecciones vengan en otro orden.
- `nombreDeArchivo`: el nombre literal del contrato.

Crea `src/dominio/copia/sobre.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { OPCIONES_INICIALES, RECURSOS_INICIALES } from '../catalogo/inicial'
import type { CatalogoApp } from '../modelo/catalogos'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import {
  EsquemaSobreCopia,
  MARCA_COPIA,
  armarCopia,
  catalogosUsados,
  nombreDeArchivo,
  serializarCopia,
  type SobreCopia,
} from './sobre'

/** El instante de la exportación en las pruebas: el archivo lleva su fecha, «2026-09-17». */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'

/** El catálogo de esta tablet: las 145 opciones y los 21 recursos de fábrica, con `borrada` y `protegida`. */
function catalogoDeLaTablet(): CatalogoApp {
  return { opciones: [...OPCIONES_INICIALES], recursos: [...RECURSOS_INICIALES] }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Un movimiento suelto, para colgarle lo que cada prueba necesite. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.otros',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

/** El estado que guarda un snapshotPrevio: el documento sin su lista de avances (§8, decisión 4). */
function estadoDelSnapshot(documento: DocumentoPartida): EstadoPartida {
  const { avances, ...estado } = documento
  void avances
  return estado
}

/**
 * Un documento con un registro de cada uno de los 20 campos de catálogo (`contrato-datos.md` §2.9) y con un
 * snapshotPrevio que usa una categoría que el estado no usa.
 */
function documentoConCatalogos(): DocumentoPartida {
  const documento = documentoMinimo()
  documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.impuestos' }]
  documento.recurrentes = [
    {
      id: 'rec.1',
      dominioId: 'dom.bree',
      tipo: 'gasto',
      concepto: 'Aceite de las lámparas',
      importe: { base: 20000 },
      categoriaId: 'cat.gastos-recurrentes',
      cuentaId: 'dom.bree',
      recurrencia: { tipo: 'mensual', diaMes: 1 },
      activo: true,
    },
  ]
  documento.impuestosRentas = [
    {
      id: 'imp.1',
      dominioId: 'dom.bree',
      sentido: 'ingreso',
      concepto: 'Renta de la herrería',
      base: 'fija',
      importe: { base: 100000 },
      categoriaId: 'cat.rentas-y-alquileres',
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.trabajadores = [
    {
      id: 'trab.1',
      dominioId: 'dom.bree',
      oficioId: 'oficio.herrero',
      numero: 2,
      salario: { base: 30000 },
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.edificios = [
    {
      id: 'ed.cerveceria',
      dominioId: 'dom.bree',
      tipoId: 'edificio.cerveceria',
      nombre: 'Cervecería del Poney',
      estado: 'activo',
      trabajadoresNecesarios: 2,
      producciones: [
        {
          id: 'prod.1',
          recursoId: 'recurso.cerveza',
          cantidad: 4,
          recurrencia: { tipo: 'semanal', diaSemana: 0 },
          acumulado: { desde: { anio: 1640, mes: 4, dia: 1 }, sumaFactores: 0 },
        },
      ],
    },
  ]
  documento.unidadesGuarnicion = [
    {
      id: 'uni.1',
      dominioId: 'dom.bree',
      tipoId: 'unidad.guardia',
      nombre: 'Guardia del portón',
      numero: 6,
      soldada: { base: 20000 },
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.defensas = [
    { id: 'def.1', dominioId: 'dom.bree', tipoId: 'defensa.empalizada', nombre: 'Empalizada del norte', estado: 'buena' },
  ]
  documento.animales = [{ id: 'ani.1', dominioId: 'dom.bree', tipoId: 'animal.vaca', cantidad: 12, genero: 'hembra' }]
  documento.obras = [
    {
      id: 'obra.granero',
      dominioId: 'dom.bree',
      nombre: 'Granero nuevo',
      estado: 'programada',
      coste: { base: 500000 },
      materiales: { 'recurso.madera': 30, 'recurso.piedra': 12 },
      inicio: { anio: 1640, mes: 4, dia: 20 },
      diasTotales: 20,
      efecto: { tipo: 'crearEdificio', tipoId: 'edificio.granero' },
    },
    {
      id: 'obra.almacen',
      dominioId: 'dom.bree',
      nombre: 'Ampliar el almacén de tela',
      estado: 'programada',
      coste: { base: 200000 },
      materiales: {},
      inicio: { anio: 1640, mes: 4, dia: 25 },
      diasTotales: 10,
      efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.tela', valor: 50 },
    },
  ]
  documento.poblaciones[0].consumos = [{ id: 'cons.1', nombre: 'Leña', recursoId: 'recurso.lena', porHabitante: 0.02 }]
  documento.existencias = [
    { dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 },
    { dominioId: 'dom.bree', recursoId: 'recurso.cerveza', cantidad: 30 },
    { dominioId: 'dom.bree', recursoId: 'recurso.sal', cantidad: 12 },
    { dominioId: 'dom.bree', recursoId: 'recurso.hierro', cantidad: 20 },
    { dominioId: 'dom.bree', recursoId: 'recurso.carbon', cantidad: 8 },
  ]
  documento.ajustesExistencias = [
    {
      id: 'aj.1',
      dominioId: 'dom.bree',
      recursoId: 'recurso.sal',
      fecha: { anio: 1640, mes: 4, dia: 2 },
      delta: -3,
      motivo: 'Se echó a perder con la humedad',
    },
  ]
  documento.entradasAlmacen = [
    {
      id: 'ent.1',
      dominioId: 'dom.bree',
      recursoId: 'recurso.hierro',
      cantidad: 10,
      operacion: 'recepcion',
      fecha: { anio: 1640, mes: 4, dia: 3 },
      aplicada: true,
    },
  ]
  documento.produccionesRealizadas = [
    {
      id: 'pr.1',
      fecha: { anio: 1640, mes: 4, dia: 8 },
      edificioId: 'ed.cerveceria',
      produccionId: 'prod.1',
      recursoId: 'recurso.cerveza',
      cantidad: 4,
      perdida: 0,
      avanceId: 'av.1',
    },
  ]
  documento.mercados[0].precios = [{ recursoId: 'recurso.vino', importe: { base: 90000 } }]
  documento.caravanas = [
    {
      id: 'car.1',
      dominioId: 'dom.bree',
      operacion: 'compra',
      mercadoId: 'mer.bree',
      carga: { recursoId: 'recurso.carbon', cantidad: 8 },
      precioUnidad: { base: 5000 },
      importe: { base: 40000 },
      salida: { anio: 1640, mes: 4, dia: 8 },
      vuelta: { anio: 1640, mes: 4, dia: 10 },
      estado: 'terminada',
    },
  ]
  documento.eventos = [
    {
      id: 'ev.1',
      dominioId: 'dom.bree',
      nombre: 'Invierno largo',
      inicio: { anio: 1640, mes: 4, dia: 1 },
      duracionDias: 10,
      efectos: [
        { ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.lena' }, pct: 20 },
        { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: 10 },
      ],
    },
  ]
  const snapshot = estadoDelSnapshot(documento)
  snapshot.movimientos = [{ ...movimientoBase('mov.viejo', 'dom.bree'), categoriaId: 'cat.comercio' }]
  documento.avances = [{ ...documento.avances[0], snapshotPrevio: snapshot }]
  return documento
}

describe('catalogosUsados', () => {
  it('recoge los 20 campos de catálogo del estado y del snapshotPrevio, sin repetir y en orden', () => {
    expect(catalogosUsados(documentoConCatalogos())).toEqual({
      opciones: [
        'animal.vaca',
        'cat.comercio',
        'cat.gastos-recurrentes',
        'cat.impuestos',
        'cat.rentas-y-alquileres',
        'defensa.empalizada',
        'edificio.cerveceria',
        'edificio.granero',
        'oficio.herrero',
        'unidad.guardia',
      ],
      recursos: [
        'recurso.carbon',
        'recurso.cerveza',
        'recurso.hierro',
        'recurso.lena',
        'recurso.madera',
        'recurso.piedra',
        'recurso.sal',
        'recurso.tela',
        'recurso.vino',
        'recurso.viveres',
      ],
    })
  })

  it('no recoge la clave fija de una categoría de coste, que no es una opción de catálogo', () => {
    const usados = catalogosUsados(documentoConCatalogos())
    expect(usados.opciones).not.toContain('salarios')
    expect(usados.recursos).not.toContain('salarios')
  })
})

describe('armarCopia', () => {
  it('lleva solo las opciones y los recursos que usan sus registros, sin borrada ni protegida', () => {
    const sobre = armarCopia(documentoConCatalogos(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(sobre.catalogos.opciones).toHaveLength(10)
    expect(sobre.catalogos.recursos).toHaveLength(10)
    expect(sobre.catalogos.opciones.every((opcion) => !('borrada' in opcion) && !('protegida' in opcion))).toBe(true)
    expect(sobre.catalogos.recursos.every((recurso) => !('borrada' in recurso) && !('protegido' in recurso))).toBe(true)
    expect(sobre.catalogos.opciones[0]).toEqual({
      id: 'cat.comercio',
      nombre: 'Comercio',
      propia: false,
      lista: 'categorias',
      grupo: 'asentamientos',
    })
    expect(sobre.catalogos.recursos[0]).toEqual({
      id: 'recurso.carbon',
      nombre: 'Carbón',
      unidadSingular: 'saco',
      unidadPlural: 'sacos',
      propia: false,
    })
  })

  it('ordena las opciones por lista y después por id, y los recursos por id', () => {
    const sobre = armarCopia(documentoConCatalogos(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(sobre.catalogos.opciones.map((opcion) => opcion.id)).toEqual([
      'cat.comercio',
      'cat.gastos-recurrentes',
      'cat.impuestos',
      'cat.rentas-y-alquileres',
      'oficio.herrero',
      'animal.vaca',
      'defensa.empalizada',
      'edificio.cerveceria',
      'edificio.granero',
      'unidad.guardia',
    ])
    expect(sobre.catalogos.recursos.map((recurso) => recurso.id)).toEqual([
      'recurso.carbon',
      'recurso.cerveza',
      'recurso.hierro',
      'recurso.lena',
      'recurso.madera',
      'recurso.piedra',
      'recurso.sal',
      'recurso.tela',
      'recurso.vino',
      'recurso.viveres',
    ])
  })

  it('arma un sobre que pasa EsquemaSobreCopia, con la marca y la versión del formato', () => {
    const sobre = armarCopia(documentoMinimo(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(sobre.app).toBe(MARCA_COPIA)
    expect(sobre.app).toBe('gestion-aldeas')
    expect(sobre.versionFormato).toBe(1)
    expect(sobre.exportadaEl).toBe(EXPORTADA_EL)
    expect(sobre.partida.partida.nombre).toBe('La Sombra del Este')
    expect(sobre.catalogos.opciones).toEqual([])
    expect(sobre.catalogos.recursos.map((recurso) => recurso.id)).toEqual(['recurso.viveres'])
    expect(EsquemaSobreCopia.safeParse(sobre).success).toBe(true)
  })
})

describe('serializarCopia', () => {
  it('da el mismo texto con el mismo estado, aunque las claves y las colecciones vengan en otro orden', () => {
    const sobre = armarCopia(documentoConCatalogos(), catalogoDeLaTablet(), EXPORTADA_EL)
    expect(serializarCopia(sobre)).toBe(serializarCopia(sobre))
    expect(serializarCopia(sobre).startsWith('{"app":"gestion-aldeas","versionFormato":1,"exportadaEl":')).toBe(true)
    expect(serializarCopia(JSON.parse(serializarCopia(sobre)) as SobreCopia)).toBe(serializarCopia(sobre))
    const desordenado: SobreCopia = {
      catalogos: {
        opciones: [...sobre.catalogos.opciones].reverse(),
        recursos: [...sobre.catalogos.recursos].reverse(),
      },
      partida: {
        ...sobre.partida,
        existencias: [...sobre.partida.existencias].reverse(),
        obras: [...sobre.partida.obras].reverse(),
      },
      exportadaEl: sobre.exportadaEl,
      versionFormato: sobre.versionFormato,
      app: sobre.app,
    }
    expect(serializarCopia(desordenado)).toBe(serializarCopia(sobre))
  })
})

describe('nombreDeArchivo', () => {
  it('da «gestion-aldeas-la-sombra-del-este-2026-09-17.json»', () => {
    expect(nombreDeArchivo(documentoMinimo().partida, EXPORTADA_EL)).toBe(
      'gestion-aldeas-la-sombra-del-este-2026-09-17.json',
    )
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/copia/sobre.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./sobre`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/copia/sobre.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/copia/sobre.test.ts [ src/dominio/copia/sobre.test.ts ]
Error: Cannot find module './sobre' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/copia/sobre.test.ts
 ❯ src/dominio/copia/sobre.test.ts:6:1
      4| import type { DocumentoPartida, EstadoPartida } from '../modelo/docum…
      5| import type { Movimiento } from '../modelo/movimientos'
      6| import {
       | ^
      7|   EsquemaSobreCopia,
      8|   MARCA_COPIA,


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:42:18
   Duration  511ms (worker 95%, environment 2%)
```

- [ ] **Paso 3: Implementar `sobre.ts`**

Tres cosas que conviene leer antes de copiar el archivo:

1. **`catalogosUsados` y `remapearCatalogos` (tarea 16) son la misma lista de 20 campos escrita dos veces**, y la tabla de referencias de `contrato-modelo.md` §4.1 es la tercera. Si alguien añade un `recursoId` o un `categoriaId` nuevo al modelo, tiene que tocar las tres; la prueba cruzada de la tarea 16 lo detecta.
2. **El orden canónico lo pone `serializarCopia`**, no `armarCopia`: así el texto sale igual venga el sobre de donde venga (recién armado o leído de un archivo). `armarCopia` sí ordena los catálogos, porque es quien los elige.
3. **`EsquemaOpcionEnCopia` es una unión discriminada**, así que quitar `borrada` y `protegida` se escribe con un `switch` por lista y no con un resto de objeto: el resto de una unión no conserva el discriminador.

Crea `src/dominio/copia/sobre.ts` con este contenido:

```ts
import * as z from 'zod'
import {
  EsquemaCatalogosEnCopia,
  type CatalogoApp,
  type OpcionCatalogo,
  type OpcionEnCopia,
  type RecursoCatalogo,
  type RecursoEnCopia,
} from '../modelo/catalogos'
import { EsquemaInstante, type Id, type Instante } from '../modelo/comunes'
import { EsquemaDocumentoPartida, type DocumentoPartida, type EstadoPartida } from '../modelo/documento'
import { VERSION_FORMATO, type Partida } from '../modelo/partida'

/** Marca de la app dentro del sobre: distingue una copia de cualquier otro JSON (decisión 6). */
export const MARCA_COPIA = 'gestion-aldeas'

/**
 * Lo mínimo que se lee antes de validar nada: sirve para distinguir «no es una copia» de «es de una versión más
 * nueva» (§6.1). `z.object` descarta lo demás, así que una copia futura con campos nuevos llega hasta aquí.
 */
export const EsquemaVersionDeCopia = z.object({
  app: z.literal(MARCA_COPIA),
  versionFormato: z.int().min(1),
})

/** Sobre de la copia: la partida completa con su versión de formato y los catálogos que usan sus registros (§6.1). */
export const EsquemaSobreCopia = z.object({
  app: z.literal(MARCA_COPIA),
  versionFormato: z.literal(VERSION_FORMATO),
  exportadaEl: EsquemaInstante,
  partida: EsquemaDocumentoPartida,
  catalogos: EsquemaCatalogosEnCopia,
})
export type SobreCopia = z.infer<typeof EsquemaSobreCopia>

/** Compara dos cadenas con `<`, sin localeCompare, que depende de la configuración regional (§3.4 del contrato). */
function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Los 20 campos de catálogo de un estado (`contrato-datos.md` §2.9), anotados en sus dos conjuntos. */
function anotarCatalogosDe(estado: EstadoPartida, opciones: Set<Id>, recursos: Set<Id>): void {
  for (const movimiento of estado.movimientos) {
    opciones.add(movimiento.categoriaId)
  }
  for (const recurrente of estado.recurrentes) {
    opciones.add(recurrente.categoriaId)
  }
  for (const impuesto of estado.impuestosRentas) {
    opciones.add(impuesto.categoriaId)
  }
  for (const trabajador of estado.trabajadores) {
    opciones.add(trabajador.oficioId)
  }
  for (const edificio of estado.edificios) {
    opciones.add(edificio.tipoId)
    for (const produccion of edificio.producciones) {
      recursos.add(produccion.recursoId)
    }
  }
  for (const unidad of estado.unidadesGuarnicion) {
    opciones.add(unidad.tipoId)
  }
  for (const defensa of estado.defensas) {
    opciones.add(defensa.tipoId)
  }
  for (const animal of estado.animales) {
    opciones.add(animal.tipoId)
  }
  for (const obra of estado.obras) {
    const efecto = obra.efecto
    if (efecto.tipo === 'crearEdificio' || efecto.tipo === 'crearDefensa') {
      opciones.add(efecto.tipoId)
    }
    if (efecto.tipo === 'ampliarAlmacen') {
      recursos.add(efecto.recursoId)
    }
    for (const recursoId of Object.keys(obra.materiales)) {
      recursos.add(recursoId)
    }
  }
  for (const poblacion of estado.poblaciones) {
    for (const consumo of poblacion.consumos) {
      recursos.add(consumo.recursoId)
    }
  }
  for (const existencia of estado.existencias) {
    recursos.add(existencia.recursoId)
  }
  for (const ajuste of estado.ajustesExistencias) {
    recursos.add(ajuste.recursoId)
  }
  for (const entrada of estado.entradasAlmacen) {
    recursos.add(entrada.recursoId)
  }
  for (const produccion of estado.produccionesRealizadas) {
    recursos.add(produccion.recursoId)
  }
  for (const mercado of estado.mercados) {
    for (const precio of mercado.precios) {
      recursos.add(precio.recursoId)
    }
  }
  for (const caravana of estado.caravanas) {
    recursos.add(caravana.carga.recursoId)
  }
  for (const evento of estado.eventos) {
    for (const efecto of evento.efectos) {
      // «categoriaCoste» no se anota: su id es una clave fija (salarios, soldadas, tributos o gastos), no una opción.
      if (efecto.ambito === 'consumo' && efecto.objetivo.tipo === 'recurso') {
        recursos.add(efecto.objetivo.id)
      }
    }
  }
}

/** Ids de catálogo que usan el estado y el snapshotPrevio del último avance, ordenados y sin repetir (§6.1). */
export function catalogosUsados(documento: DocumentoPartida): { opciones: Id[]; recursos: Id[] } {
  const opciones = new Set<Id>()
  const recursos = new Set<Id>()
  anotarCatalogosDe(documento, opciones, recursos)
  for (const avance of documento.avances) {
    if (avance.snapshotPrevio !== undefined) {
      anotarCatalogosDe(avance.snapshotPrevio, opciones, recursos)
    }
  }
  return {
    opciones: [...opciones].sort(compararTexto),
    recursos: [...recursos].sort(compararTexto),
  }
}

/** Una opción tal como viaja en la copia: sin `borrada` ni `protegida` (§6.1, decisión 7). */
function opcionEnCopia(opcion: OpcionCatalogo): OpcionEnCopia {
  switch (opcion.lista) {
    case 'categorias':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'categorias', grupo: opcion.grupo }
    case 'oficios':
      return {
        id: opcion.id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'oficios',
        grupo: opcion.grupo,
        plural: opcion.plural,
      }
    case 'tiposEdificio':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposEdificio', grupo: opcion.grupo }
    case 'tiposUnidad':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposUnidad', grupo: opcion.grupo }
    case 'tiposDefensa':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposDefensa' }
    case 'tiposAnimal':
      return { id: opcion.id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposAnimal', grupo: opcion.grupo }
  }
}

/** Un recurso tal como viaja en la copia: sin `borrada` ni `protegido` (§6.1). */
function recursoEnCopia(recurso: RecursoCatalogo): RecursoEnCopia {
  return {
    id: recurso.id,
    nombre: recurso.nombre,
    unidadSingular: recurso.unidadSingular,
    unidadPlural: recurso.unidadPlural,
    propia: recurso.propia,
  }
}

/** Arma el sobre con el documento y solo las opciones y recursos que usan sus registros (§6.1). */
export function armarCopia(documento: DocumentoPartida, catalogo: CatalogoApp, exportadaEl: Instante): SobreCopia {
  const usados = catalogosUsados(documento)
  const opcionesUsadas = new Set(usados.opciones)
  const recursosUsados = new Set(usados.recursos)
  const opciones = catalogo.opciones
    .filter((opcion) => opcionesUsadas.has(opcion.id))
    .map(opcionEnCopia)
    .sort((a, b) => compararTexto(a.lista, b.lista) || compararTexto(a.id, b.id))
  const recursos = catalogo.recursos
    .filter((recurso) => recursosUsados.has(recurso.id))
    .map(recursoEnCopia)
    .sort((a, b) => compararTexto(a.id, b.id))
  return {
    app: MARCA_COPIA,
    versionFormato: VERSION_FORMATO,
    exportadaEl,
    partida: documento,
    catalogos: { opciones, recursos },
  }
}

/** Una colección ordenada por una clave de texto, sin tocar la original. */
function ordenarPor<T>(lista: readonly T[], clave: (registro: T) => string): T[] {
  return [...lista].sort((a, b) => compararTexto(clave(a), clave(b)))
}

/** El estado con las claves de EsquemaEstadoPartida en su orden y cada colección ordenada por su clave (§3.4). */
function ordenarEstado(estado: EstadoPartida): EstadoPartida {
  return {
    partida: estado.partida,
    dominios: ordenarPor(estado.dominios, (dominio) => dominio.id),
    cajas: ordenarPor(estado.cajas, (caja) => caja.dominioId),
    movimientos: ordenarPor(estado.movimientos, (movimiento) => movimiento.id),
    transferencias: ordenarPor(estado.transferencias, (transferencia) => transferencia.id),
    deudas: ordenarPor(estado.deudas, (deuda) => deuda.id),
    recurrentes: ordenarPor(estado.recurrentes, (recurrente) => recurrente.id),
    objetos: ordenarPor(estado.objetos, (objeto) => objeto.id),
    ventas: ordenarPor(estado.ventas, (venta) => venta.id),
    inversiones: ordenarPor(estado.inversiones, (inversion) => inversion.id),
    hechizos: ordenarPor(estado.hechizos, (hechizo) => hechizo.id),
    intentos: ordenarPor(estado.intentos, (intento) => intento.id),
    pergaminos: ordenarPor(estado.pergaminos, (pergamino) => pergamino.id),
    poblaciones: ordenarPor(estado.poblaciones, (poblacion) => poblacion.dominioId),
    existencias: [...estado.existencias].sort(
      (a, b) => compararTexto(a.dominioId, b.dominioId) || compararTexto(a.recursoId, b.recursoId),
    ),
    ajustesExistencias: ordenarPor(estado.ajustesExistencias, (ajuste) => ajuste.id),
    entradasAlmacen: ordenarPor(estado.entradasAlmacen, (entrada) => entrada.id),
    edificios: ordenarPor(estado.edificios, (edificio) => edificio.id),
    produccionesRealizadas: ordenarPor(estado.produccionesRealizadas, (produccion) => produccion.id),
    trabajadores: ordenarPor(estado.trabajadores, (trabajador) => trabajador.id),
    obras: ordenarPor(estado.obras, (obra) => obra.id),
    impuestosRentas: ordenarPor(estado.impuestosRentas, (impuesto) => impuesto.id),
    tiposLocal: ordenarPor(estado.tiposLocal, (tipo) => tipo.id),
    localesComerciales: ordenarPor(estado.localesComerciales, (local) => local.id),
    mercados: ordenarPor(estado.mercados, (mercado) => mercado.id),
    rutas: [...estado.rutas].sort(
      (a, b) =>
        compararTexto(a.origenId, b.origenId) ||
        compararTexto(a.destino.tipo, b.destino.tipo) ||
        compararTexto(a.destino.id, b.destino.id),
    ),
    caravanas: ordenarPor(estado.caravanas, (caravana) => caravana.id),
    unidadesGuarnicion: ordenarPor(estado.unidadesGuarnicion, (unidad) => unidad.id),
    defensas: ordenarPor(estado.defensas, (defensa) => defensa.id),
    animales: ordenarPor(estado.animales, (animal) => animal.id),
    armeria: ordenarPor(estado.armeria, (objeto) => objeto.id),
    eventos: ordenarPor(estado.eventos, (evento) => evento.id),
    ubicaciones: ordenarPor(estado.ubicaciones, (ubicacion) => ubicacion.id),
    personas: ordenarPor(estado.personas, (persona) => persona.id),
  }
}

/** El documento en orden canónico, con `avances` al final y el snapshotPrevio ordenado como un estado más (§3.4). */
function ordenarDocumento(documento: DocumentoPartida): DocumentoPartida {
  const avances = [...documento.avances]
    .sort((a, b) => compararTexto(a.aplicadoEl, b.aplicadoEl) || compararTexto(a.id, b.id))
    .map((avance) =>
      avance.snapshotPrevio === undefined
        ? avance
        : { ...avance, snapshotPrevio: ordenarEstado(avance.snapshotPrevio) },
    )
  return { ...ordenarEstado(documento), avances }
}

/** Texto JSON del sobre, con las claves en orden fijo: dos exportaciones del mismo estado dan el mismo archivo. */
export function serializarCopia(sobre: SobreCopia): string {
  const canonico: SobreCopia = {
    app: sobre.app,
    versionFormato: sobre.versionFormato,
    exportadaEl: sobre.exportadaEl,
    partida: ordenarDocumento(sobre.partida),
    catalogos: {
      opciones: [...sobre.catalogos.opciones].sort(
        (a, b) => compararTexto(a.lista, b.lista) || compararTexto(a.id, b.id),
      ),
      recursos: ordenarPor(sobre.catalogos.recursos, (recurso) => recurso.id),
    },
  }
  return JSON.stringify(canonico)
}

/** Marcas diacríticas que la descomposición NFD separa de su letra (de U+0300 a U+036F). */
const MARCAS_DIACRITICAS = /[\u0300-\u036f]/g

/** Cada tramo que no es letra sin tilde ni cifra: se convierte en un guion. */
const TRAMOS_NO_ALFANUMERICOS = /[^a-z0-9]+/g

/** Guiones sobrantes al principio y al final del nombre del archivo. */
const GUIONES_DE_LOS_EXTREMOS = /^-+|-+$/g

/** Nombre del archivo: «gestion-aldeas-la-sombra-del-este-2026-09-17.json». */
export function nombreDeArchivo(partida: Partida, exportadaEl: Instante): string {
  const cuerpo = partida.nombre
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(TRAMOS_NO_ALFANUMERICOS, '-')
    .replace(GUIONES_DE_LOS_EXTREMOS, '')
  // Un nombre que solo tenga signos deja el cuerpo vacío: el archivo se llama «partida».
  return `gestion-aldeas-${cuerpo === '' ? 'partida' : cuerpo}-${exportadaEl.slice(0, 10)}.json`
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/copia/sobre.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/dominio/copia/sobre.test.ts (7 tests) 41ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  11:45:33
   Duration  624ms (transform 48%, import 31%, worker 10%, tests 6%)
```

- [ ] **Paso 5: Escribir la prueba que falla de `exportar.ts`**

Esta prueba sí toca la base: usa `baseDePrueba()` (tarea 9) con su `IDBFactory` nueva, siembra el catálogo de fábrica (tarea 11) y crea la partida con `crearPartida` (tarea 10), que es como llega una partida de verdad a la tabla.

Crea `src/datos/copia/exportar.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { serializarCopia } from '../../dominio/copia/sobre'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { BaseDeDatos } from '../baseDeDatos'
import { sembrarCatalogo } from '../catalogos'
import { baseDePrueba } from '../pruebas/baseDePrueba'
import { crearPartida } from '../repositorio'
import { exportarCopia } from './exportar'

/** El instante de la exportación en las pruebas: el archivo lleva su fecha, «2026-09-17». */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
    movimientos: [
      {
        id: 'mov.peaje',
        dominioId: 'dom.bree',
        fecha: { anio: 1640, mes: 4, dia: 12 },
        tipo: 'ingreso',
        importe: { base: 60000 },
        categoriaId: 'cat.impuestos',
        concepto: 'Peaje del puente',
        origen: 'manual',
        programado: false,
      },
    ],
    transferencias: [],
    deudas: [],
    recurrentes: [],
    objetos: [],
    ventas: [],
    inversiones: [],
    hechizos: [],
    intentos: [],
    pergaminos: [],
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Deja la base como la tendría la app: el catálogo de fábrica sembrado y la partida guardada. */
async function basePreparada(): Promise<void> {
  await sembrarCatalogo(db)
  await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
}

describe('exportarCopia', () => {
  it('da el archivo con su nombre, su texto y el sobre de la partida guardada', async () => {
    await basePreparada()
    const archivo = await exportarCopia(db, 'p.sombra-del-este', EXPORTADA_EL)
    expect(archivo.nombre).toBe('gestion-aldeas-la-sombra-del-este-2026-09-17.json')
    expect(archivo.sobre.app).toBe('gestion-aldeas')
    expect(archivo.sobre.versionFormato).toBe(1)
    expect(archivo.sobre.exportadaEl).toBe(EXPORTADA_EL)
    expect(archivo.sobre.partida.partida.id).toBe('p.sombra-del-este')
    expect(archivo.texto).toBe(serializarCopia(archivo.sobre))
  })

  it('lleva solo los catálogos que usan sus registros, sin borrada ni protegida', async () => {
    await basePreparada()
    const archivo = await exportarCopia(db, 'p.sombra-del-este', EXPORTADA_EL)
    expect(archivo.sobre.catalogos.opciones).toEqual([
      { id: 'cat.impuestos', nombre: 'Impuestos', propia: false, lista: 'categorias', grupo: 'asentamientos' },
    ])
    expect(archivo.sobre.catalogos.recursos).toEqual([
      {
        id: 'recurso.viveres',
        nombre: 'Víveres',
        unidadSingular: 'saco',
        unidadPlural: 'sacos',
        propia: false,
      },
    ])
  })

  it('anota exportadaEl en el resumen y no toca la partida (decisión 9)', async () => {
    await basePreparada()
    await exportarCopia(db, 'p.sombra-del-este', EXPORTADA_EL)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.exportadaEl).toBe(EXPORTADA_EL)
    expect(resumen?.abiertaEl).toBe('2026-09-17T09:30:00.000Z')
    expect(resumen?.actualizada).toBe('2026-09-17T09:00:00.000Z')
    const guardado = await db.partidas.get('p.sombra-del-este')
    expect(guardado?.partida.actualizada).toBe('2026-09-17T09:00:00.000Z')
    expect(guardado?.partida.cambiosDesdeUltimoAvance).toBe(0)
  })

  it('exportar una partida que no existe lanza el error de programación del contrato', async () => {
    await sembrarCatalogo(db)
    await expect(exportarCopia(db, 'p.no-existe', EXPORTADA_EL)).rejects.toThrow(
      'No hay ninguna partida con el id «p.no-existe»',
    )
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/copia/exportar.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./exportar`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/copia/exportar.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/copia/exportar.test.ts [ src/datos/copia/exportar.test.ts ]
Error: Cannot find module './exportar' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/copia/exportar.test.ts
 ❯ src/datos/copia/exportar.test.ts:7:1
      5| import { baseDePrueba } from '../pruebas/baseDePrueba'
      6| import { crearPartida } from '../repositorio'
      7| import { exportarCopia } from './exportar'
       | ^
      8|
      9| /** El instante de la exportación en las pruebas: el archivo lleva s…


 Test Files  1 failed (1)
      Tests  no tests
   Start at  11:49:02
   Duration  548ms (worker 94%, environment 2%)
```

- [ ] **Paso 7: Implementar `exportar.ts`**

Crea `src/datos/copia/exportar.ts` con este contenido:

```ts
import { armarCopia, nombreDeArchivo, serializarCopia, type SobreCopia } from '../../dominio/copia/sobre'
import type { Id, Instante } from '../../dominio/modelo/comunes'
import type { BaseDeDatos } from '../baseDeDatos'
import { leerCatalogo } from '../catalogos'
import { leerPartida } from '../repositorio'

/** El archivo listo para descargar, con su nombre y su texto. */
export interface ArchivoCopia {
  nombre: string
  texto: string
  sobre: SobreCopia
}

/**
 * Lee la partida y el catálogo, arma la copia y anota exportadaEl en el resumen; lanza si la partida no existe
 * (§6.1, P6). Dentro de la transacción solo se lee: armar y serializar se hace fuera (`tecnica.md` §6.2).
 */
export async function exportarCopia(db: BaseDeDatos, id: Id, exportadaEl: Instante): Promise<ArchivoCopia> {
  const leido = await db.transaction('r', db.partidas, db.opcionesCatalogo, db.recursosCatalogo, async () => {
    const documento = await leerPartida(db, id)
    if (documento === undefined) {
      return undefined
    }
    return { documento, catalogo: await leerCatalogo(db) }
  })
  if (leido === undefined) {
    throw new Error(`No hay ninguna partida con el id «${id}»`)
  }
  const sobre = armarCopia(leido.documento, leido.catalogo, exportadaEl)
  const archivo: ArchivoCopia = {
    nombre: nombreDeArchivo(leido.documento.partida, exportadaEl),
    texto: serializarCopia(sobre),
    sobre,
  }
  // Exportar no cambia el estado: solo la fila del resumen, que es de esta tablet (decisión 9).
  await db.resumenes.update(id, { exportadaEl })
  return archivo
}
```

- `leerCatalogo` (tarea 11) devuelve el catálogo **entero**, también lo borrado: `armarCopia` se queda solo con lo que usan los registros y quita `borrada` y `protegida`.
- La transacción es de solo lectura (`'r'`) y abarca las tres tablas que se leen. La escritura de `exportadaEl` va después, fuera: son dos cosas distintas y no hace falta que compartan transacción.

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/copia/exportar.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/datos/copia/exportar.test.ts (4 tests) 196ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  11:52:40
   Duration  871ms (transform 37%, import 25%, worker 15%, tests 17%)
```

- [ ] **Paso 9: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que al `ordenarEstado` de `sobre.ts` le falta una de las 34 claves del estado o que una de las uniones discriminadas del modelo no se ha estrechado bien; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **456 pruebas en 37 archivos**. La tarea 13 dejó 444 pruebas en 35 archivos, y esta tarea trae **12 nuevas**: 7 de `sobre.test.ts`, 4 de `exportar.test.ts` y **una más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/copia/sobre.ts`. Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with fsModuleCache: true»), que no es un fallo:

```text
 Test Files  37 passed (37)
      Tests  456 passed (456)
```

- [ ] **Paso 10: Commit**

```bash
git add src/dominio/copia/sobre.ts src/dominio/copia/sobre.test.ts src/datos/copia/exportar.ts src/datos/copia/exportar.test.ts
git commit -m "feat(copia): sobre de la copia, catálogos que viajan y exportación de una partida" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/datos/copia/exportar.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/copia/exportar.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/sobre.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/sobre.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 7c1b204] feat(copia): sobre de la copia, catálogos que viajan y exportación de una partida
 4 files changed, 919 insertions(+)
 create mode 100644 src/datos/copia/exportar.test.ts
 create mode 100644 src/datos/copia/exportar.ts
 create mode 100644 src/dominio/copia/sobre.test.ts
 create mode 100644 src/dominio/copia/sobre.ts
```

---

### Tarea 15 · Analizar copia: versión, migraciones y validación

Leer una copia es decidir cuatro cosas en este orden: si el archivo es siquiera una copia de esta app, si es de una versión más nueva (y entonces se rechaza), si es de una versión anterior (y entonces se migra) y si lo que trae dentro está entero. Esta tarea escribe los tres módulos puros que lo hacen: `migraciones.ts` (la cadena de migraciones, vacía en el formato 1), `comoCopia.ts` (la partida duplicada de «Importar como copia») y `analizar.ts`, que junta los siete pasos del contrato y devuelve la copia validada o el motivo del rechazo con su mensaje literal.

Depende de la tarea 13 (`validarCopia`, `problemasDeZod` y `detalleDeProblemas`) y de la tarea 14 (`EsquemaVersionDeCopia`, `EsquemaSobreCopia`); del modelo usa `VERSION_FORMATO` (tarea 3) y, en `comoCopia`, `normalizarNombre` (tarea 7). No toca la base: quien escribe es la tarea 17.

**Reglas de la especificación que implementa:**

- **versionFormato (§6.1).** «El formato 1 ya usa Hechizo, TipoLocal y LocalComercial. Una copia con versionFormato mayor que la de la app se rechaza: “Esta copia es de una versión más nueva de la app”. Una copia con versionFormato menor se migra al importar, y el resumen lo dice.»
- **Validación estricta (decisión 14).** «Se rechaza la copia entera si falla cualquier regla estructural… Mensajes: “Este archivo no es una copia de Gestión de Aldeas” y “La copia está dañada: \<detalle\>”. **Los campos desconocidos se descartan**.» Se descartan porque los esquemas son `z.object`, no `z.strictObject`.
- **El orden de los siete pasos (`contrato-datos.md` §2.7).** `JSON.parse` → `EsquemaVersionDeCopia` → versión mayor → migración → `EsquemaSobreCopia` → `validarCopia` → `ok`. Cada paso corta: una copia que no es una copia no llega a validarse.
- **El detalle se lee igual venga de donde venga (decisión propia 29).** El `<detalle>` técnico lo escribe siempre `detalleDeProblemas`, tanto si los problemas vienen de Zod (a través de `problemasDeZod`) como si vienen de los tres validadores. **No se usa `z.prettifyError`**, que escribe «→ at», en inglés.
- **La migración llega al snapshot (decisión propia 33).** El `snapshotPrevio` es «la partida completa» y lleva su propio `versionFormato`, así que la cadena de migraciones lo recorre también. Con el formato 1 no hay ninguna migración: la tabla queda vacía y con su prueba.
- **«Importar como copia» (§6.1).** «Si ya existe la misma partida (mismo id), pregunta “Reemplazar” o “Importar como copia”.» La copia cambia **solo** `partida.id` y `partida.nombre`, también dentro de `avances[].snapshotPrevio.partida`; los ids internos no cambian, porque solo tienen que ser únicos dentro del documento, y `creada` y `actualizada` se conservan.
- **Nombres que se comparan sin mayúsculas ni tildes (§6.6).** `nombreDeCopia` mira los nombres que ya hay con `normalizarNombre`, así que «la sombra del este (copia)» y «La Sombra del Este (Copia)» son el mismo nombre.
- **El dominio es puro (plan de la fase 1).** Los tres módulos solo importan del propio dominio; Zod está permitido (decisión 15). La prueba de pureza de la tarea 1 recorre los tres módulos nuevos.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/copia/migraciones.ts`, `src/dominio/copia/comoCopia.ts`, `src/dominio/copia/analizar.ts`
- Prueba: `src/dominio/copia/migraciones.test.ts`, `src/dominio/copia/comoCopia.test.ts`, `src/dominio/copia/analizar.test.ts`

Los tres archivos de prueba repiten a propósito el mismo constructor de datos (`documentoMinimo`): la partida de ejemplo no existe hasta la tarea 20 y el contrato no da ningún archivo de ayuda compartido para las pruebas del dominio.

- [ ] **Paso 1: Escribir la prueba que falla de `migraciones.ts`**

El formato 1 es el primero, así que la tabla de migraciones está vacía y **no se puede ejercitar con datos reales**: la prueba inyecta una migración de mentira del formato 0 al 1 y la quita después (`contrato-datos.md` §3.4). Con ella se comprueba lo único que importa de `migrar`: que la migración toca el sobre **y** cada `avances[].snapshotPrevio`, y que la versión del formato queda puesta en los tres sitios donde vive.

Crea `src/dominio/copia/migraciones.test.ts` con este contenido:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { VERSION_FORMATO } from '../modelo/partida'
import { MIGRACIONES, migrar } from './migraciones'

/** La tabla sin el `Readonly` de su tipo: solo las pruebas inyectan migraciones, y las quitan al terminar. */
const tabla = MIGRACIONES as Record<number, (datos: unknown) => unknown>

afterEach(() => {
  delete tabla[0]
})

/** Baja por un dato sin tipar: lo que llega de un archivo no tiene tipo hasta que pasa el esquema. */
function como(valor: unknown): Record<string, unknown> {
  return valor as Record<string, unknown>
}

/** La lista de objetos que hay en una clave. */
function lista(valor: unknown): Record<string, unknown>[] {
  return valor as Record<string, unknown>[]
}

/** Un sobre de la versión que se le pida, con un movimiento y un avance con snapshotPrevio. */
function sobreDeFormato(version: number): unknown {
  return {
    app: 'gestion-aldeas',
    versionFormato: version,
    exportadaEl: '2026-09-17T18:30:00.000Z',
    partida: {
      partida: { id: 'p.sombra-del-este', nombre: 'La Sombra del Este', versionFormato: version },
      movimientos: [{ id: 'mov.peaje', concepto: 'Peaje del puente' }],
      avances: [
        {
          id: 'av.1',
          snapshotPrevio: {
            partida: { id: 'p.sombra-del-este', nombre: 'La Sombra del Este', versionFormato: version },
            movimientos: [{ id: 'mov.viejo', concepto: 'Cobro de locales' }],
          },
        },
      ],
    },
    catalogos: { opciones: [], recursos: [] },
  }
}

/**
 * Una migración de mentira: marca los movimientos que encuentra. Los del sobre están en `partida.movimientos`
 * y los del snapshot, en `movimientos`, así que mira los dos sitios.
 */
function marcarMovimientos(datos: unknown): unknown {
  const objeto = { ...como(datos) }
  if (Array.isArray(objeto.movimientos)) {
    objeto.movimientos = lista(objeto.movimientos).map((movimiento) => ({ ...movimiento, migrado: true }))
  }
  const documento = objeto.partida === undefined ? undefined : como(objeto.partida)
  if (documento !== undefined && Array.isArray(documento.movimientos)) {
    objeto.partida = {
      ...documento,
      movimientos: lista(documento.movimientos).map((movimiento) => ({ ...movimiento, migrado: true })),
    }
  }
  return objeto
}

describe('MIGRACIONES', () => {
  it('en el formato 1 la tabla está vacía y migrar deja los datos como están', () => {
    expect(VERSION_FORMATO).toBe(1)
    expect(Object.keys(MIGRACIONES)).toEqual([])
    expect(migrar(sobreDeFormato(VERSION_FORMATO), VERSION_FORMATO)).toEqual(sobreDeFormato(VERSION_FORMATO))
  })
})

describe('migrar', () => {
  it('aplica la migración al sobre y a avances[].snapshotPrevio, y deja la versión puesta en los tres sitios', () => {
    tabla[0] = marcarMovimientos
    const migrado = como(migrar(sobreDeFormato(0), 0))
    const documento = como(migrado.partida)
    const snapshot = como(lista(documento.avances)[0].snapshotPrevio)
    expect(lista(documento.movimientos)[0].migrado).toBe(true)
    expect(lista(snapshot.movimientos)[0].migrado).toBe(true)
    expect(migrado.versionFormato).toBe(VERSION_FORMATO)
    expect(como(documento.partida).versionFormato).toBe(VERSION_FORMATO)
    expect(como(snapshot.partida).versionFormato).toBe(VERSION_FORMATO)
  })

  it('lanza si falta la migración de un tramo de la cadena', () => {
    expect(() => migrar(sobreDeFormato(0), 0)).toThrow('No hay ninguna migración del formato 0 al 1')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/copia/migraciones.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./migraciones`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/copia/migraciones.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/copia/migraciones.test.ts [ src/dominio/copia/migraciones.test.ts ]
Error: Cannot find module './migraciones' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/copia/migraciones.test.ts
 ❯ src/dominio/copia/migraciones.test.ts:3:1
      1| import { afterEach, describe, expect, it } from 'vitest'
      2| import { VERSION_FORMATO } from '../modelo/partida'
      3| import { MIGRACIONES, migrar } from './migraciones'
       | ^
      4|
      5| /** La tabla sin el `Readonly` de su tipo: solo las pruebas inyectan…


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:04:51
   Duration  486ms (worker 95%, environment 2%)
```

- [ ] **Paso 3: Implementar `migraciones.ts`**

El reparto entre la tabla y `migrar` es el que hace que una migración futura sea corta de escribir: **cada `MIGRACIONES[n]` solo cambia formas** (renombrar un campo, partir una colección) y **`migrar` se ocupa de lo mecánico**: recorrer la cadena, llevar cada migración también a los `snapshotPrevio` y dejar la versión puesta en los tres sitios donde vive (el sobre, `partida.partida` y `snapshotPrevio.partida` de cada avance).

La tabla **no se congela** con `Object.freeze`: su `Readonly` es del tipo, y así la prueba puede inyectar una migración de mentira mientras el formato 1 no tenga ninguna de verdad.

Crea `src/dominio/copia/migraciones.ts` con este contenido:

```ts
import { VERSION_FORMATO } from '../modelo/partida'

/** Lo que hace una migración: recibe el contenido de un formato y devuelve el del formato siguiente. */
export type Migracion = (datos: unknown) => unknown

/** MIGRACIONES[n] convierte el contenido del formato n al n + 1; el formato 1 es el primero, así que está vacía (§6.1). */
export const MIGRACIONES: Readonly<Record<number, Migracion>> = {}

/** El objeto de un valor desconocido, o undefined si no es un objeto llano: lo que llega de un archivo no tiene tipo. */
function comoObjeto(valor: unknown): Record<string, unknown> | undefined {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : undefined
}

/** Aplica una migración al sobre y, aparte, a cada avances[].snapshotPrevio, que es una partida completa. */
function aplicar(datos: unknown, migracion: Migracion): unknown {
  const migrado = migracion(datos)
  const sobre = comoObjeto(migrado)
  if (sobre === undefined) {
    return migrado
  }
  const documento = comoObjeto(sobre.partida)
  if (documento === undefined || !Array.isArray(documento.avances)) {
    return migrado
  }
  const avances = documento.avances.map((valor) => {
    const avance = comoObjeto(valor)
    if (avance === undefined || avance.snapshotPrevio === undefined) {
      return valor
    }
    return { ...avance, snapshotPrevio: migracion(avance.snapshotPrevio) }
  })
  return { ...sobre, partida: { ...documento, avances } }
}

/** La partida con su versionFormato puesto; vale para la cabecera del documento y para la del snapshot. */
function conVersionDeLaPartida(valor: unknown, version: number): unknown {
  const partida = comoObjeto(valor)
  return partida === undefined ? valor : { ...partida, versionFormato: version }
}

/** El avance con la versionFormato puesta dentro de su snapshotPrevio, si lo lleva. */
function conVersionDelAvance(valor: unknown, version: number): unknown {
  const avance = comoObjeto(valor)
  if (avance === undefined || avance.snapshotPrevio === undefined) {
    return valor
  }
  const snapshot = comoObjeto(avance.snapshotPrevio)
  if (snapshot === undefined) {
    return valor
  }
  return { ...avance, snapshotPrevio: { ...snapshot, partida: conVersionDeLaPartida(snapshot.partida, version) } }
}

/** Pone la versión del formato en los tres sitios donde vive: el sobre, la partida y cada snapshotPrevio (§6.1). */
function conVersionFormato(datos: unknown, version: number): unknown {
  const sobre = comoObjeto(datos)
  if (sobre === undefined) {
    return datos
  }
  const documento = comoObjeto(sobre.partida)
  if (documento === undefined) {
    return { ...sobre, versionFormato: version }
  }
  const avances = Array.isArray(documento.avances)
    ? documento.avances.map((avance) => conVersionDelAvance(avance, version))
    : documento.avances
  return {
    ...sobre,
    versionFormato: version,
    partida: { ...documento, partida: conVersionDeLaPartida(documento.partida, version), avances },
  }
}

/** Aplica en cadena las migraciones desde desdeVersion hasta VERSION_FORMATO, también dentro de snapshotPrevio (§6.1). */
export function migrar(datos: unknown, desdeVersion: number): unknown {
  let contenido = datos
  for (let version = desdeVersion; version < VERSION_FORMATO; version += 1) {
    const migracion = MIGRACIONES[version]
    if (migracion === undefined) {
      throw new Error(`No hay ninguna migración del formato ${version} al ${version + 1}`)
    }
    contenido = aplicar(contenido, migracion)
  }
  return conVersionFormato(contenido, VERSION_FORMATO)
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/copia/migraciones.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/dominio/copia/migraciones.test.ts (3 tests) 12ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  12:07:19
   Duration  402ms (transform 44%, import 30%, worker 12%, tests 4%)
```

- [ ] **Paso 5: Escribir la prueba que falla de `comoCopia.ts`**

Crea `src/dominio/copia/comoCopia.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import { comoCopia, nombreDeCopia } from './comoCopia'

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** El estado que guarda un snapshotPrevio: el documento sin su lista de avances (§8, decisión 4). */
function estadoDelSnapshot(documento: DocumentoPartida): EstadoPartida {
  const { avances, ...estado } = documento
  void avances
  return estado
}

/** El documento con el snapshotPrevio puesto en su último avance (decisión 4). */
function documentoConSnapshot(): DocumentoPartida {
  const documento = documentoMinimo()
  documento.avances = [{ ...documento.avances[0], snapshotPrevio: estadoDelSnapshot(documentoMinimo()) }]
  return documento
}

describe('comoCopia', () => {
  it('cambia el id y el nombre de la partida, también en el snapshot, y no toca nada más', () => {
    const original = documentoConSnapshot()
    const copia = comoCopia(original, 'p.copia-1', 'La Sombra del Este (copia)')
    expect(copia.partida.id).toBe('p.copia-1')
    expect(copia.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(copia.avances[0].snapshotPrevio?.partida.id).toBe('p.copia-1')
    expect(copia.avances[0].snapshotPrevio?.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(copia.dominios.map((dominio) => dominio.id)).toEqual(['dom.tharan', 'dom.bree'])
    expect(copia.avances.map((avance) => avance.id)).toEqual(['av.1'])
    expect(copia.mercados[0].id).toBe('mer.bree')
    expect(copia.partida.creada).toBe('2026-09-17T08:00:00.000Z')
    expect(copia.partida.actualizada).toBe('2026-09-17T09:00:00.000Z')
    expect(original.partida.id).toBe('p.sombra-del-este')
    expect(original.partida.nombre).toBe('La Sombra del Este')
    expect(original.avances[0].snapshotPrevio?.partida.id).toBe('p.sombra-del-este')
  })
})

describe('nombreDeCopia', () => {
  it('da «(copia)» y, si ya existe, «(copia 2)» y «(copia 3)», comparando sin mayúsculas ni tildes', () => {
    expect(nombreDeCopia('La Sombra del Este', [])).toBe('La Sombra del Este (copia)')
    expect(nombreDeCopia('La Sombra del Este', ['La Sombra del Este', 'La Sombra del Este (copia)'])).toBe(
      'La Sombra del Este (copia 2)',
    )
    expect(
      nombreDeCopia('La Sombra del Este', [
        'La Sombra del Este',
        'La Sombra del Este (copia)',
        'La Sombra del Este (copia 2)',
      ]),
    ).toBe('La Sombra del Este (copia 3)')
    expect(nombreDeCopia('La Sombra del Este', ['  la sombra del este (COPIA)  '])).toBe(
      'La Sombra del Este (copia 2)',
    )
  })

  it('recorta el nombre para que la copia quepa en los 60 caracteres del campo', () => {
    const largo = 'A'.repeat(60)
    const primera = nombreDeCopia(largo, [])
    expect(primera).toHaveLength(60)
    expect(primera.endsWith(' (copia)')).toBe(true)
    const segunda = nombreDeCopia(largo, [primera])
    expect(segunda).toHaveLength(60)
    expect(segunda.endsWith(' (copia 2)')).toBe(true)
  })
})
```

- [ ] **Paso 6: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/copia/comoCopia.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./comoCopia`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/copia/comoCopia.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/copia/comoCopia.test.ts [ src/dominio/copia/comoCopia.test.ts ]
Error: Cannot find module './comoCopia' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/copia/comoCopia.test.ts
 ❯ src/dominio/copia/comoCopia.test.ts:3:1
      1| import { describe, expect, it } from 'vitest'
      2| import type { DocumentoPartida, EstadoPartida } from '../modelo/docu…
      3| import { comoCopia, nombreDeCopia } from './comoCopia'
       | ^
      4|
      5| /** Un documento válido y mínimo: el personaje, un asentamiento y lo…


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:11:35
   Duration  497ms (worker 95%, environment 2%)
```

- [ ] **Paso 7: Implementar `comoCopia.ts`**

Crea `src/dominio/copia/comoCopia.ts` con este contenido:

```ts
import type { Id } from '../modelo/comunes'
import type { DocumentoPartida } from '../modelo/documento'
import { normalizarNombre } from '../texto/normalizar'

/** Lo que admite el nombre de una partida (EsquemaNombreLibre, §8): de 1 a 60 caracteres. */
const LARGO_MAXIMO_NOMBRE = 60

/** Copia el documento con id de partida nuevo y nombre nuevo, también dentro de snapshotPrevio (§6.1). */
export function comoCopia(documento: DocumentoPartida, idNuevo: Id, nombreNuevo: string): DocumentoPartida {
  return {
    ...documento,
    partida: { ...documento.partida, id: idNuevo, nombre: nombreNuevo },
    avances: documento.avances.map((avance) =>
      avance.snapshotPrevio === undefined
        ? avance
        : {
            ...avance,
            snapshotPrevio: {
              ...avance.snapshotPrevio,
              partida: { ...avance.snapshotPrevio.partida, id: idNuevo, nombre: nombreNuevo },
            },
          },
    ),
  }
}

/** El nombre con su sufijo, recortado para que no pase de los 60 caracteres del campo. */
function conSufijo(nombre: string, sufijo: string): string {
  const base = nombre.slice(0, Math.max(1, LARGO_MAXIMO_NOMBRE - sufijo.length)).trimEnd()
  return `${base}${sufijo}`
}

/** «La Sombra del Este» → «La Sombra del Este (copia)», y «(copia 2)», «(copia 3)»… si ya existen. */
export function nombreDeCopia(nombre: string, existentes: readonly string[]): string {
  const tomados = new Set(existentes.map(normalizarNombre))
  let candidato = conSufijo(nombre, ' (copia)')
  let numero = 1
  while (tomados.has(normalizarNombre(candidato))) {
    numero += 1
    candidato = conSufijo(nombre, ` (copia ${numero})`)
  }
  return candidato
}
```

- `comoCopia` cambia **solo** `partida.id` y `partida.nombre`: los ids internos (dominios, movimientos, avances…) solo tienen que ser únicos dentro del documento, así que no se tocan, y `creada` y `actualizada` se conservan (§6.1).
- `nombreDeCopia` compara con `normalizarNombre` (§6.6), así que no propone un nombre que ya existe escrito con otras mayúsculas.

- [ ] **Paso 8: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/copia/comoCopia.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/dominio/copia/comoCopia.test.ts (3 tests) 14ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  12:14:02
   Duration  431ms (transform 46%, import 29%, worker 11%, tests 5%)
```

- [ ] **Paso 9: Escribir la prueba que falla de `analizar.ts`**

La prueba arma copias de verdad con `armarCopia` y `serializarCopia` (tarea 14) y luego las estropea, que es como llegan los archivos rotos: un texto que no es JSON, un JSON que no es una copia, una versión más nueva, una fecha imposible (la pilla el esquema), una categoría inventada (la pillan los validadores) y un campo desconocido, que **no** es un error.

Crea `src/dominio/copia/analizar.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { OPCIONES_INICIALES, RECURSOS_INICIALES } from '../catalogo/inicial'
import type { CatalogoApp } from '../modelo/catalogos'
import type { DocumentoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { analizarCopia } from './analizar'
import { armarCopia, serializarCopia } from './sobre'

/** El instante de la exportación en las pruebas. */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'

/** El catálogo de esta tablet: las 145 opciones y los 21 recursos de fábrica. */
function catalogoDeLaTablet(): CatalogoApp {
  return { opciones: [...OPCIONES_INICIALES], recursos: [...RECURSOS_INICIALES] }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Un movimiento suelto, para colgarle lo que cada prueba necesite. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.impuestos',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

/** El texto de una copia válida de «La Sombra del Este», tal como lo escribiría exportarCopia. */
function textoDeCopia(): string {
  return serializarCopia(armarCopia(documentoMinimo(), catalogoDeLaTablet(), EXPORTADA_EL))
}

/** El texto de una copia válida con un retoque a mano, que es como llegan los archivos rotos. */
function textoRetocado(retocar: (sobre: Record<string, unknown>) => void): string {
  const sobre = JSON.parse(textoDeCopia()) as Record<string, unknown>
  retocar(sobre)
  return JSON.stringify(sobre)
}

describe('analizarCopia', () => {
  it('acepta una copia del formato actual y dice que no ha hecho falta migrarla', () => {
    const resultado = analizarCopia(textoDeCopia())
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) {
      return
    }
    expect(resultado.migrada).toBe(false)
    expect(resultado.desdeVersion).toBe(1)
    expect(resultado.copia.partida.partida.id).toBe('p.sombra-del-este')
    expect(resultado.copia.catalogos.recursos.map((recurso) => recurso.id)).toEqual(['recurso.viveres'])
  })

  it('un texto que no es JSON no es una copia', () => {
    const resultado = analizarCopia('esto no es un archivo de la app')
    expect(resultado).toEqual({
      ok: false,
      motivo: 'noEsCopia',
      mensaje: 'Este archivo no es una copia de Gestión de Aldeas',
    })
  })

  it('un JSON sin la marca de la app tampoco es una copia', () => {
    expect(analizarCopia(JSON.stringify({ partidas: [] }))).toEqual({
      ok: false,
      motivo: 'noEsCopia',
      mensaje: 'Este archivo no es una copia de Gestión de Aldeas',
    })
    expect(analizarCopia(JSON.stringify({ app: 'otra-app', versionFormato: 1 }))).toEqual({
      ok: false,
      motivo: 'noEsCopia',
      mensaje: 'Este archivo no es una copia de Gestión de Aldeas',
    })
  })

  it('una copia de una versión más nueva se rechaza con el mensaje de la especificación', () => {
    const texto = textoRetocado((sobre) => {
      sobre.versionFormato = 2
    })
    expect(analizarCopia(texto)).toEqual({
      ok: false,
      motivo: 'versionMasNueva',
      mensaje: 'Esta copia es de una versión más nueva de la app',
    })
  })

  it('una fecha imposible la pilla el esquema, con el detalle en castellano', () => {
    const texto = textoRetocado((sobre) => {
      const documento = sobre.partida as Record<string, unknown>
      documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), fecha: { anio: 1640, mes: 4, dia: 31 } }]
    })
    const resultado = analizarCopia(texto)
    expect(resultado.ok).toBe(false)
    if (resultado.ok) {
      return
    }
    expect(resultado.motivo).toBe('daniada')
    expect(resultado.mensaje).toBe('La copia está dañada')
    expect(resultado.detalle).toContain('✖ Abril de 1640 tiene 30 días')
    expect(resultado.detalle).toContain('→ en partida.movimientos[0].fecha')
    expect(resultado.detalle).not.toContain('→ at')
  })

  it('una categoría que no viaja en la copia la pillan los validadores, con su ruta dentro del documento', () => {
    const texto = textoRetocado((sobre) => {
      const documento = sobre.partida as Record<string, unknown>
      documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.posadas' }]
    })
    const resultado = analizarCopia(texto)
    expect(resultado.ok).toBe(false)
    if (resultado.ok) {
      return
    }
    expect(resultado.motivo).toBe('daniada')
    expect(resultado.mensaje).toBe('La copia está dañada')
    expect(resultado.detalle).toBe('✖ No existe la categoría «cat.posadas»\n  → en movimientos[0].categoriaId')
  })

  it('los campos desconocidos se descartan y la copia se acepta (decisión 14)', () => {
    const texto = textoRetocado((sobre) => {
      sobre.desconocido = 'lo que traiga una versión futura'
      const documento = sobre.partida as Record<string, unknown>
      const partida = documento.partida as Record<string, unknown>
      partida.apodo = 'La Sombra'
    })
    const resultado = analizarCopia(texto)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) {
      return
    }
    expect('desconocido' in resultado.copia).toBe(false)
    expect('apodo' in resultado.copia.partida.partida).toBe(false)
  })
})
```

- [ ] **Paso 10: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/copia/analizar.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./analizar`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/copia/analizar.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/copia/analizar.test.ts [ src/dominio/copia/analizar.test.ts ]
Error: Cannot find module './analizar' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/copia/analizar.test.ts
 ❯ src/dominio/copia/analizar.test.ts:6:1
      4| import type { DocumentoPartida } from '../modelo/documento'
      5| import type { Movimiento } from '../modelo/movimientos'
      6| import { analizarCopia } from './analizar'
       | ^
      7| import { armarCopia, serializarCopia } from './sobre'


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:18:44
   Duration  521ms (worker 94%, environment 2%)
```

- [ ] **Paso 11: Implementar `analizar.ts`**

Dos cosas que conviene leer antes de copiar el archivo:

1. **`mensaje` y `detalle` van separados.** La interfaz escribe «La copia está dañada: \<detalle\>» (`contrato-datos.md` §3.1), pero el detalle es técnico y va **plegado** (fase 9): por eso `mensaje` es la frase corta y `detalle` es el texto de varias líneas que escribe `detalleDeProblemas`. Quien pinte el diálogo los junta con «: ».
2. **Una migración que falle también deja la copia dañada.** El contrato no lo dice porque el formato 1 no tiene migraciones; el error se convierte en un problema con la ruta «la copia», que es la misma ruta que usa `problemasDeZod` para un error de la raíz.

Crea `src/dominio/copia/analizar.ts` con este contenido:

```ts
import { VERSION_FORMATO } from '../modelo/partida'
import { detalleDeProblemas, problemasDeZod, validarCopia } from '../validacion/coherencia'
import { migrar } from './migraciones'
import { EsquemaSobreCopia, EsquemaVersionDeCopia, type SobreCopia } from './sobre'

/** Por qué se rechaza una copia (§6.1, decisión 14). */
export type MotivoRechazo = 'noEsCopia' | 'versionMasNueva' | 'daniada'

export type ResultadoAnalisis =
  | { ok: true; copia: SobreCopia; migrada: boolean; desdeVersion: number }
  | { ok: false; motivo: MotivoRechazo; mensaje: string; detalle?: string }

/** El archivo no es una copia de esta app: ni es JSON, ni trae la marca y la versión (decisión 14). */
const MENSAJE_NO_ES_COPIA = 'Este archivo no es una copia de Gestión de Aldeas'

/** La copia es de un formato que esta app todavía no conoce (§6.1, literal de la especificación). */
const MENSAJE_VERSION_MAS_NUEVA = 'Esta copia es de una versión más nueva de la app'

/** Falla el esquema, las referencias o las unicidades. La interfaz escribe «La copia está dañada: <detalle>». */
const MENSAJE_DANIADA = 'La copia está dañada'

/** El rechazo de una copia dañada, con su detalle técnico ya formateado. */
function daniada(detalle: string): ResultadoAnalisis {
  return { ok: false, motivo: 'daniada', mensaje: MENSAJE_DANIADA, detalle }
}

/**
 * Lee el texto de un archivo y devuelve la copia validada y migrada, o el motivo del rechazo (§6.1, decisión 14).
 * Los siete pasos van en el orden del contrato (`contrato-datos.md` §2.7) y cada uno corta.
 */
export function analizarCopia(texto: string): ResultadoAnalisis {
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch {
    return { ok: false, motivo: 'noEsCopia', mensaje: MENSAJE_NO_ES_COPIA }
  }

  const version = EsquemaVersionDeCopia.safeParse(datos)
  if (!version.success) {
    return { ok: false, motivo: 'noEsCopia', mensaje: MENSAJE_NO_ES_COPIA }
  }
  const desdeVersion = version.data.versionFormato
  if (desdeVersion > VERSION_FORMATO) {
    return { ok: false, motivo: 'versionMasNueva', mensaje: MENSAJE_VERSION_MAS_NUEVA }
  }

  const migrada = desdeVersion < VERSION_FORMATO
  let contenido: unknown = datos
  if (migrada) {
    try {
      contenido = migrar(datos, desdeVersion)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se ha podido actualizar la copia'
      return daniada(detalleDeProblemas([{ ruta: 'la copia', mensaje }]))
    }
  }

  // z.object descarta los campos desconocidos: una copia con campos de más se acepta (decisión 14).
  const sobre = EsquemaSobreCopia.safeParse(contenido)
  if (!sobre.success) {
    return daniada(detalleDeProblemas(problemasDeZod(sobre.error)))
  }

  const problemas = validarCopia(sobre.data.partida, sobre.data.catalogos)
  if (problemas.length > 0) {
    return daniada(detalleDeProblemas(problemas))
  }

  return { ok: true, copia: sobre.data, migrada, desdeVersion }
}
```

- [ ] **Paso 12: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/copia/analizar.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/dominio/copia/analizar.test.ts (7 tests) 63ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  12:22:10
   Duration  702ms (transform 45%, import 30%, worker 10%, tests 8%)
```

- [ ] **Paso 13: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que la unión de `ResultadoAnalisis` no se ha estrechado bien (leer `copia` sin comprobar antes `ok`); `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **472 pruebas en 40 archivos**. La tarea 14 dejó 456 pruebas en 37 archivos, y esta tarea trae **16 nuevas**: 3 de `migraciones.test.ts`, 3 de `comoCopia.test.ts`, 7 de `analizar.test.ts` y **tres más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `migraciones.ts`, `comoCopia.ts` y `analizar.ts`:

```text
 Test Files  40 passed (40)
      Tests  472 passed (472)
```

- [ ] **Paso 14: Commit**

```bash
git add src/dominio/copia/migraciones.ts src/dominio/copia/migraciones.test.ts src/dominio/copia/comoCopia.ts src/dominio/copia/comoCopia.test.ts src/dominio/copia/analizar.ts src/dominio/copia/analizar.test.ts
git commit -m "feat(copia): análisis de una copia, cadena de migraciones e importar como copia" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/copia/analizar.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/analizar.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/comoCopia.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/comoCopia.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/migraciones.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/migraciones.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 5a9d3e1] feat(copia): análisis de una copia, cadena de migraciones e importar como copia
 6 files changed, 639 insertions(+)
 create mode 100644 src/dominio/copia/analizar.test.ts
 create mode 100644 src/dominio/copia/analizar.ts
 create mode 100644 src/dominio/copia/comoCopia.test.ts
 create mode 100644 src/dominio/copia/comoCopia.ts
 create mode 100644 src/dominio/copia/migraciones.test.ts
 create mode 100644 src/dominio/copia/migraciones.ts
```

---

### Tarea 16 · Fusión de catálogos y remapeo

Los catálogos son de la app y se comparten entre partidas (§6.5), así que una copia que llega de otra tablet trae opciones que aquí pueden llamarse de otra manera, estar borradas, no existir o existir con otro id. Esta tarea escribe la función pura que casa unos con otros, la que aplica el resultado a los registros de la partida y la que escribe las líneas que el jugador lee al terminar de importar. Todo vive en `src/dominio/copia/fusion.ts`; quien escribe en la base es la tarea 17.

Depende de la tarea 15 por el orden del plan; de verdad usa `normalizarNombre` (tarea 7), los tipos de catálogo de `modelo/catalogos.ts` con `NOMBRE_LISTA` y `ARTICULO_LISTA` (tarea 6) y los tipos del documento (tarea 6). `nuevoId` **se recibe como parámetro**: `crypto` es del navegador y vive en `src/datos/ids.ts` (tarea 9), así que el dominio no lo importa.

**Reglas de la especificación que implementa:**

- **Cómo se casan los catálogos (§6.1).** «Al importar, las de la app se casan por id: si el nombre difiere, se queda el de esta tablet y el resumen lo dice; si están borradas, se reactivan. Las tuyas se unen por nombre normalizado en la misma lista o se crean con id nuevo, y los registros se remapean.»
- **Las seis reglas literales de la fusión (`contrato-datos.md` §2.9).** 1) opción de la app que existe por id: manda la tablet; 2) opción de la app que la tablet no conoce: se crea tal cual; 3) opción propia: se busca en su misma lista y **entre las no borradas** por nombre normalizado, y si no aparece se crea con `nuevoId()` conservando `grupo` y `plural`; 4) al unir por nombre, `grupo` y `plural` de la tablet se conservan sin decir nada, y las **unidades** de un recurso que difieran sí se anotan, porque las cantidades guardadas dependen de ellas; 5) los recursos siguen las mismas reglas, y como «Víveres» está reservado, un recurso propio llamado «víveres» acaba unido a `recurso.viveres`; 6) `remapeo` solo lleva las entradas cuyo id cambia.
- **Comparación de nombres (§6.6).** «Se compara sin mayúsculas, tildes, diéresis ni espacios dobles. La ñ no equivale a la n.» Lo hace `normalizarNombre` (tarea 7).
- **Los 20 campos de catálogo (`contrato-datos.md` §2.9).** `remapearCatalogos` recorre los mismos 20 campos que `catalogosUsados` (tarea 14), en el estado **y** dentro de `avances[].snapshotPrevio`, incluidas las **claves** de `Obra.materiales`. **No** se remapea `objetivo.tipo === 'categoriaCoste'`: su id es una clave fija (`salarios`, `soldadas`, `tributos` o `gastos`), no una opción de catálogo.
- **La lista está escrita tres veces (aviso 7 del contrato).** `catalogosUsados`, `remapearCatalogos` y la tabla de referencias de `contrato-modelo.md` §4.1 son la misma lista. La última prueba de este archivo es la comprobación cruzada: después de remapear, `catalogosUsados` no encuentra ni uno solo de los ids viejos.
- **El resumen lo dice (§6.1 y decisión 7).** Las líneas literales están en `contrato-datos.md` §3.4 y se nombran con `ARTICULO_LISTA` y `NOMBRE_LISTA`: «La categoría», «El oficio», «El tipo de edificio», «El tipo de unidad», «El tipo de defensa», «El tipo de animal» y «El recurso».
- **El dominio es puro (plan de la fase 1).** `fusion.ts` no importa Dexie, ni React, ni APIs del navegador, y recibe `nuevoId` por parámetro. La prueba de pureza de la tarea 1 recorre también este módulo nuevo.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/copia/fusion.ts`
- Prueba: `src/dominio/copia/fusion.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba arma catálogos pequeños a mano, un caso por regla, y repite el constructor de documento de las tareas 13 y 14 (`documentoMinimo` y `documentoConCatalogos`, con un registro de cada uno de los 20 campos de catálogo) para el remapeo.

Qué comprueba cada bloque:
- `fusionarCatalogos`: las tres reglas de las opciones (por id, creada, unida por nombre), la reactivación, el índice que se actualiza con lo que crea la propia fusión, que la búsqueda por nombre no mira ni las borradas ni otra lista, los recursos con «víveres» y con otras unidades, y que el remapeo solo lleva lo que cambia.
- `lineasDeFusion`: los textos literales del apartado 3.4, en su orden.
- `remapearCatalogos`: los 20 campos, el `snapshotPrevio`, la clave fija que no se toca, el remapeo vacío y la comprobación cruzada con `catalogosUsados`.

Crea `src/dominio/copia/fusion.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import type {
  CatalogoApp,
  CatalogosEnCopia,
  OpcionCatalogo,
  OpcionEnCopia,
  RecursoCatalogo,
  RecursoEnCopia,
} from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import { fusionarCatalogos, lineasDeFusion, remapearCatalogos, type ResumenFusion } from './fusion'
import { catalogosUsados } from './sobre'

/** Ids nuevos y predecibles: id.nuevo.1, id.nuevo.2… En la app los da nuevoId() (tarea 9). */
function idsDePrueba(): () => Id {
  let cuantos = 0
  return () => {
    cuantos += 1
    return `id.nuevo.${cuantos}`
  }
}

/** Los catálogos que acompañan a una copia. */
function catalogosDeLaCopia(opciones: OpcionEnCopia[], recursos: RecursoEnCopia[] = []): CatalogosEnCopia {
  return { opciones, recursos }
}

/** El catálogo de esta tablet. */
function catalogoDeLaTablet(opciones: OpcionCatalogo[], recursos: RecursoCatalogo[] = []): CatalogoApp {
  return { opciones, recursos }
}

/** Una categoría tal como viaja en la copia (§6.1): sin `borrada` ni `protegida`. */
function categoriaEnCopia(id: Id, nombre: string, propia = false): OpcionEnCopia {
  return { id, nombre, propia, lista: 'categorias', grupo: propia ? 'tuyas' : 'gastosPersonaje' }
}

/** Una categoría del catálogo de esta tablet. */
function categoriaEnLaTablet(id: Id, nombre: string, extra: { propia?: boolean; borrada?: boolean } = {}): OpcionCatalogo {
  const propia = extra.propia ?? false
  return {
    id,
    nombre,
    propia,
    lista: 'categorias',
    grupo: propia ? 'tuyas' : 'gastosPersonaje',
    borrada: extra.borrada ?? false,
  }
}

/** Un oficio tal como viaja en la copia: es la única lista que guarda plural (§6.5 n.º 22). */
function oficioEnCopia(id: Id, nombre: string, plural: string, propia = false): OpcionEnCopia {
  return { id, nombre, plural, propia, lista: 'oficios', grupo: 'oficios' }
}

/** Un oficio del catálogo de esta tablet. */
function oficioEnLaTablet(id: Id, nombre: string, plural: string): OpcionCatalogo {
  return { id, nombre, plural, propia: false, lista: 'oficios', grupo: 'oficios', borrada: false }
}

/** Un recurso tal como viaja en la copia (§6.1): sin `borrada` ni `protegido`. */
function recursoEnCopia(
  id: Id,
  nombre: string,
  unidadSingular: string,
  unidadPlural: string,
  propia = false,
): RecursoEnCopia {
  return { id, nombre, unidadSingular, unidadPlural, propia }
}

/** Un recurso del catálogo de esta tablet. */
function recursoEnLaTablet(
  id: Id,
  nombre: string,
  unidadSingular: string,
  unidadPlural: string,
  extra: { propia?: boolean; borrada?: boolean; protegido?: 'viveres' | 'reserva' } = {},
): RecursoCatalogo {
  return {
    id,
    nombre,
    unidadSingular,
    unidadPlural,
    propia: extra.propia ?? false,
    borrada: extra.borrada ?? false,
    protegido: extra.protegido,
  }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(): DocumentoPartida {
  return {
    partida: {
      id: 'p.sombra-del-este',
      nombre: 'La Sombra del Este',
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** Un movimiento suelto, para colgarle lo que cada prueba necesite. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.otros',
    concepto: 'Peaje del puente',
    origen: 'manual',
    programado: false,
  }
}

/** El estado que guarda un snapshotPrevio: el documento sin su lista de avances (§8, decisión 4). */
function estadoDelSnapshot(documento: DocumentoPartida): EstadoPartida {
  const { avances, ...estado } = documento
  void avances
  return estado
}

/**
 * Un documento con un registro de cada uno de los 20 campos de catálogo (`contrato-datos.md` §2.9) y con un
 * snapshotPrevio que usa una categoría que el estado no usa.
 */
function documentoConCatalogos(): DocumentoPartida {
  const documento = documentoMinimo()
  documento.movimientos = [{ ...movimientoBase('mov.1', 'dom.bree'), categoriaId: 'cat.impuestos' }]
  documento.recurrentes = [
    {
      id: 'rec.1',
      dominioId: 'dom.bree',
      tipo: 'gasto',
      concepto: 'Aceite de las lámparas',
      importe: { base: 20000 },
      categoriaId: 'cat.gastos-recurrentes',
      cuentaId: 'dom.bree',
      recurrencia: { tipo: 'mensual', diaMes: 1 },
      activo: true,
    },
  ]
  documento.impuestosRentas = [
    {
      id: 'imp.1',
      dominioId: 'dom.bree',
      sentido: 'ingreso',
      concepto: 'Renta de la herrería',
      base: 'fija',
      importe: { base: 100000 },
      categoriaId: 'cat.rentas-y-alquileres',
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.trabajadores = [
    {
      id: 'trab.1',
      dominioId: 'dom.bree',
      oficioId: 'oficio.herrero',
      numero: 2,
      salario: { base: 30000 },
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.edificios = [
    {
      id: 'ed.cerveceria',
      dominioId: 'dom.bree',
      tipoId: 'edificio.cerveceria',
      nombre: 'Cervecería del Poney',
      estado: 'activo',
      trabajadoresNecesarios: 2,
      producciones: [
        {
          id: 'prod.1',
          recursoId: 'recurso.cerveza',
          cantidad: 4,
          recurrencia: { tipo: 'semanal', diaSemana: 0 },
          acumulado: { desde: { anio: 1640, mes: 4, dia: 1 }, sumaFactores: 0 },
        },
      ],
    },
  ]
  documento.unidadesGuarnicion = [
    {
      id: 'uni.1',
      dominioId: 'dom.bree',
      tipoId: 'unidad.guardia',
      nombre: 'Guardia del portón',
      numero: 6,
      soldada: { base: 20000 },
      recurrencia: { tipo: 'mensual', diaMes: 1 },
    },
  ]
  documento.defensas = [
    { id: 'def.1', dominioId: 'dom.bree', tipoId: 'defensa.empalizada', nombre: 'Empalizada del norte', estado: 'buena' },
  ]
  documento.animales = [{ id: 'ani.1', dominioId: 'dom.bree', tipoId: 'animal.vaca', cantidad: 12, genero: 'hembra' }]
  documento.obras = [
    {
      id: 'obra.granero',
      dominioId: 'dom.bree',
      nombre: 'Granero nuevo',
      estado: 'programada',
      coste: { base: 500000 },
      materiales: { 'recurso.madera': 30, 'recurso.piedra': 12 },
      inicio: { anio: 1640, mes: 4, dia: 20 },
      diasTotales: 20,
      efecto: { tipo: 'crearEdificio', tipoId: 'edificio.granero' },
    },
    {
      id: 'obra.almacen',
      dominioId: 'dom.bree',
      nombre: 'Ampliar el almacén de tela',
      estado: 'programada',
      coste: { base: 200000 },
      materiales: {},
      inicio: { anio: 1640, mes: 4, dia: 25 },
      diasTotales: 10,
      efecto: { tipo: 'ampliarAlmacen', recursoId: 'recurso.tela', valor: 50 },
    },
  ]
  documento.poblaciones[0].consumos = [{ id: 'cons.1', nombre: 'Leña', recursoId: 'recurso.lena', porHabitante: 0.02 }]
  documento.existencias = [
    { dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 },
    { dominioId: 'dom.bree', recursoId: 'recurso.cerveza', cantidad: 30 },
    { dominioId: 'dom.bree', recursoId: 'recurso.sal', cantidad: 12 },
    { dominioId: 'dom.bree', recursoId: 'recurso.hierro', cantidad: 20 },
    { dominioId: 'dom.bree', recursoId: 'recurso.carbon', cantidad: 8 },
  ]
  documento.ajustesExistencias = [
    {
      id: 'aj.1',
      dominioId: 'dom.bree',
      recursoId: 'recurso.sal',
      fecha: { anio: 1640, mes: 4, dia: 2 },
      delta: -3,
      motivo: 'Se echó a perder con la humedad',
    },
  ]
  documento.entradasAlmacen = [
    {
      id: 'ent.1',
      dominioId: 'dom.bree',
      recursoId: 'recurso.hierro',
      cantidad: 10,
      operacion: 'recepcion',
      fecha: { anio: 1640, mes: 4, dia: 3 },
      aplicada: true,
    },
  ]
  documento.produccionesRealizadas = [
    {
      id: 'pr.1',
      fecha: { anio: 1640, mes: 4, dia: 8 },
      edificioId: 'ed.cerveceria',
      produccionId: 'prod.1',
      recursoId: 'recurso.cerveza',
      cantidad: 4,
      perdida: 0,
      avanceId: 'av.1',
    },
  ]
  documento.mercados[0].precios = [{ recursoId: 'recurso.vino', importe: { base: 90000 } }]
  documento.caravanas = [
    {
      id: 'car.1',
      dominioId: 'dom.bree',
      operacion: 'compra',
      mercadoId: 'mer.bree',
      carga: { recursoId: 'recurso.carbon', cantidad: 8 },
      precioUnidad: { base: 5000 },
      importe: { base: 40000 },
      salida: { anio: 1640, mes: 4, dia: 8 },
      vuelta: { anio: 1640, mes: 4, dia: 10 },
      estado: 'terminada',
    },
  ]
  documento.eventos = [
    {
      id: 'ev.1',
      dominioId: 'dom.bree',
      nombre: 'Invierno largo',
      inicio: { anio: 1640, mes: 4, dia: 1 },
      duracionDias: 10,
      efectos: [
        { ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.lena' }, pct: 20 },
        { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: 10 },
      ],
    },
  ]
  const snapshot = estadoDelSnapshot(documento)
  snapshot.movimientos = [{ ...movimientoBase('mov.viejo', 'dom.bree'), categoriaId: 'cat.comercio' }]
  documento.avances = [{ ...documento.avances[0], snapshotPrevio: snapshot }]
  return documento
}

/** Un remapeo que le cambia el final a todos los ids de catálogo que usa el documento. */
function remapeoDeTodo(documento: DocumentoPartida): Record<Id, Id> {
  const usados = catalogosUsados(documento)
  const remapeo: Record<Id, Id> = {}
  for (const id of [...usados.opciones, ...usados.recursos]) {
    remapeo[id] = `${id}.tablet`
  }
  return remapeo
}

describe('fusionarCatalogos: las opciones de la app', () => {
  it('se casan por id: manda el nombre de esta tablet y el resumen lo dice', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.alojamiento', 'Hospedaje')]),
      catalogoDeLaTablet([categoriaEnLaTablet('cat.alojamiento', 'Alojamiento')]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({})
    expect(fusion.cambios).toEqual({
      opcionesNuevas: [],
      recursosNuevos: [],
      opcionesReactivadas: [],
      recursosReactivados: [],
    })
    expect(fusion.resumen.nombresConservados).toEqual([
      { id: 'cat.alojamiento', lista: 'categorias', enLaCopia: 'Hospedaje', enLaTablet: 'Alojamiento' },
    ])
  })

  it('una opción borrada en esta tablet se reactiva (decisión 7)', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.comercio', 'Comercio')]),
      catalogoDeLaTablet([categoriaEnLaTablet('cat.comercio', 'Comercio', { borrada: true })]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesReactivadas).toEqual(['cat.comercio'])
    expect(fusion.resumen.reactivadas).toEqual([{ id: 'cat.comercio', lista: 'categorias', nombre: 'Comercio' }])
    expect(fusion.resumen.nombresConservados).toEqual([])
    expect(fusion.remapeo).toEqual({})
  })

  it('una opción de la app que esta tablet no conoce se crea tal cual, con su id', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.peajes', 'Peajes')]),
      catalogoDeLaTablet([]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesNuevas).toEqual([
      {
        id: 'cat.peajes',
        nombre: 'Peajes',
        propia: false,
        lista: 'categorias',
        grupo: 'gastosPersonaje',
        borrada: false,
      },
    ])
    expect(fusion.resumen.creadas).toEqual([
      { id: 'cat.peajes', lista: 'categorias', nombre: 'Peajes', propia: false },
    ])
    expect(fusion.remapeo).toEqual({})
  })
})

describe('fusionarCatalogos: las opciones propias', () => {
  it('se unen por nombre normalizado a la de esta tablet y el registro se remapea', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.copia.posadas', 'Posadas del camino', true)]),
      catalogoDeLaTablet([categoriaEnLaTablet('cat.mias.posadas', 'Posadas del Camino', { propia: true })]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({ 'cat.copia.posadas': 'cat.mias.posadas' })
    expect(fusion.cambios.opcionesNuevas).toEqual([])
    expect(fusion.resumen.unidasPorNombre).toEqual([
      {
        idEnLaCopia: 'cat.copia.posadas',
        id: 'cat.mias.posadas',
        lista: 'categorias',
        nombre: 'Posadas del Camino',
      },
    ])
  })

  it('sin coincidencia se crean con nuevoId(), conservando grupo y plural', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([oficioEnCopia('oficio.copia.cetrero', 'Cetrero', 'Cetreros', true)]),
      catalogoDeLaTablet([]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesNuevas).toEqual([
      {
        id: 'id.nuevo.1',
        nombre: 'Cetrero',
        plural: 'Cetreros',
        propia: true,
        lista: 'oficios',
        grupo: 'oficios',
        borrada: false,
      },
    ])
    expect(fusion.remapeo).toEqual({ 'oficio.copia.cetrero': 'id.nuevo.1' })
    expect(fusion.resumen.creadas).toEqual([
      { id: 'id.nuevo.1', lista: 'oficios', nombre: 'Cetrero', propia: true },
    ])
  })

  it('dos propias con el mismo nombre acaban en la misma opción: la que crea la propia fusión', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([
        categoriaEnCopia('cat.copia.posadas', 'Posadas del camino', true),
        categoriaEnCopia('cat.copia.posadas-2', 'posadas del camino', true),
      ]),
      catalogoDeLaTablet([]),
      idsDePrueba(),
    )
    expect(fusion.cambios.opcionesNuevas).toHaveLength(1)
    expect(fusion.remapeo).toEqual({ 'cat.copia.posadas': 'id.nuevo.1', 'cat.copia.posadas-2': 'id.nuevo.1' })
    expect(fusion.resumen.unidasPorNombre).toEqual([
      {
        idEnLaCopia: 'cat.copia.posadas-2',
        id: 'id.nuevo.1',
        lista: 'categorias',
        nombre: 'Posadas del camino',
      },
    ])
  })

  it('la búsqueda por nombre no mira las borradas ni las de otra lista', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([categoriaEnCopia('cat.copia.herrero', 'Herrero', true)]),
      catalogoDeLaTablet([
        categoriaEnLaTablet('cat.mias.herrero', 'Herrero', { propia: true, borrada: true }),
        oficioEnLaTablet('oficio.herrero', 'Herrero', 'Herreros'),
      ]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({ 'cat.copia.herrero': 'id.nuevo.1' })
    expect(fusion.resumen.unidasPorNombre).toEqual([])
    expect(fusion.resumen.creadas).toEqual([
      { id: 'id.nuevo.1', lista: 'categorias', nombre: 'Herrero', propia: true },
    ])
  })

  it('el remapeo solo lleva las entradas cuyo id cambia', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([
        categoriaEnCopia('cat.alojamiento', 'Alojamiento'),
        categoriaEnCopia('cat.mias.posadas', 'Posadas del camino', true),
      ]),
      catalogoDeLaTablet([
        categoriaEnLaTablet('cat.alojamiento', 'Alojamiento'),
        categoriaEnLaTablet('cat.mias.posadas', 'Posadas del camino', { propia: true }),
      ]),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({})
    expect(fusion.resumen.unidasPorNombre).toEqual([
      {
        idEnLaCopia: 'cat.mias.posadas',
        id: 'cat.mias.posadas',
        lista: 'categorias',
        nombre: 'Posadas del camino',
      },
    ])
  })
})

describe('fusionarCatalogos: los recursos', () => {
  it('un recurso propio llamado «víveres» se une al recurso de la partida (§6.6)', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([], [recursoEnCopia('recurso.copia.viveres', 'víveres', 'saco', 'sacos', true)]),
      catalogoDeLaTablet(
        [],
        [recursoEnLaTablet('recurso.viveres', 'Víveres', 'saco', 'sacos', { protegido: 'viveres' })],
      ),
      idsDePrueba(),
    )
    expect(fusion.remapeo).toEqual({ 'recurso.copia.viveres': 'recurso.viveres' })
    expect(fusion.cambios.recursosNuevos).toEqual([])
    expect(fusion.resumen.unidasPorNombre).toEqual([
      { idEnLaCopia: 'recurso.copia.viveres', id: 'recurso.viveres', lista: 'recursos', nombre: 'Víveres' },
    ])
  })

  it('un recurso con otras unidades conserva las de esta tablet y lo anota', () => {
    const fusion = fusionarCatalogos(
      catalogosDeLaCopia([], [recursoEnCopia('recurso.sal', 'Sal', 'fardo', 'fardos')]),
      catalogoDeLaTablet([], [recursoEnLaTablet('recurso.sal', 'Sal', 'saco', 'sacos')]),
      idsDePrueba(),
    )
    expect(fusion.cambios.recursosNuevos).toEqual([])
    expect(fusion.resumen.unidadesConservadas).toEqual([
      { id: 'recurso.sal', nombre: 'Sal', enLaCopia: 'fardo / fardos', enLaTablet: 'saco / sacos' },
    ])
  })
})

describe('lineasDeFusion', () => {
  it('da los textos literales del contrato, en orden', () => {
    const resumen: ResumenFusion = {
      nombresConservados: [
        { id: 'cat.alojamiento', lista: 'categorias', enLaCopia: 'Hospedaje', enLaTablet: 'Alojamiento' },
      ],
      reactivadas: [
        { id: 'cat.comercio', lista: 'categorias', nombre: 'Comercio' },
        { id: 'oficio.molinero', lista: 'oficios', nombre: 'Molinero' },
      ],
      unidasPorNombre: [
        {
          idEnLaCopia: 'cat.copia.posadas',
          id: 'cat.mias.posadas',
          lista: 'categorias',
          nombre: 'Posadas del camino',
        },
      ],
      creadas: [
        { id: 'id.nuevo.1', lista: 'categorias', nombre: 'Posadas del camino', propia: true },
        { id: 'cat.peajes', lista: 'categorias', nombre: 'Peajes', propia: false },
        { id: 'recurso.cal', lista: 'recursos', nombre: 'Cal', propia: false },
      ],
      unidadesConservadas: [
        { id: 'recurso.sal', nombre: 'Sal', enLaCopia: 'fardo / fardos', enLaTablet: 'saco / sacos' },
      ],
    }
    expect(lineasDeFusion(resumen)).toEqual([
      'La categoría «Alojamiento» se llama «Hospedaje» en la copia: se conserva el nombre de esta tablet.',
      'Se ha recuperado la categoría «Comercio», que estaba eliminada.',
      'Se ha recuperado el oficio «Molinero», que estaba eliminado.',
      'La categoría «Posadas del camino» de la copia se ha unido a la tuya con el mismo nombre.',
      'Se ha añadido tu categoría «Posadas del camino».',
      'Se ha añadido la categoría «Peajes», que esta tablet no tenía.',
      'Se ha añadido el recurso «Cal», que esta tablet no tenía.',
      'El recurso «Sal» se mide aquí en «saco / sacos» y en la copia en «fardo / fardos»: se conservan las unidades de esta tablet.',
    ])
  })
})

describe('remapearCatalogos', () => {
  it('alcanza los 20 campos de catálogo del estado', () => {
    const documento = documentoConCatalogos()
    const remapeado = remapearCatalogos(documento, remapeoDeTodo(documento))
    expect(remapeado.movimientos[0].categoriaId).toBe('cat.impuestos.tablet')
    expect(remapeado.recurrentes[0].categoriaId).toBe('cat.gastos-recurrentes.tablet')
    expect(remapeado.impuestosRentas[0].categoriaId).toBe('cat.rentas-y-alquileres.tablet')
    expect(remapeado.trabajadores[0].oficioId).toBe('oficio.herrero.tablet')
    expect(remapeado.edificios[0].tipoId).toBe('edificio.cerveceria.tablet')
    expect(remapeado.edificios[0].producciones[0].recursoId).toBe('recurso.cerveza.tablet')
    expect(remapeado.unidadesGuarnicion[0].tipoId).toBe('unidad.guardia.tablet')
    expect(remapeado.defensas[0].tipoId).toBe('defensa.empalizada.tablet')
    expect(remapeado.animales[0].tipoId).toBe('animal.vaca.tablet')
    expect(remapeado.obras[0].efecto).toEqual({ tipo: 'crearEdificio', tipoId: 'edificio.granero.tablet' })
    expect(remapeado.obras[1].efecto).toEqual({
      tipo: 'ampliarAlmacen',
      recursoId: 'recurso.tela.tablet',
      valor: 50,
    })
    expect(Object.keys(remapeado.obras[0].materiales)).toEqual(['recurso.madera.tablet', 'recurso.piedra.tablet'])
    expect(remapeado.poblaciones[0].consumos[0].recursoId).toBe('recurso.lena.tablet')
    expect(remapeado.existencias.map((existencia) => existencia.recursoId)).toEqual([
      'recurso.viveres.tablet',
      'recurso.cerveza.tablet',
      'recurso.sal.tablet',
      'recurso.hierro.tablet',
      'recurso.carbon.tablet',
    ])
    expect(remapeado.ajustesExistencias[0].recursoId).toBe('recurso.sal.tablet')
    expect(remapeado.entradasAlmacen[0].recursoId).toBe('recurso.hierro.tablet')
    expect(remapeado.produccionesRealizadas[0].recursoId).toBe('recurso.cerveza.tablet')
    expect(remapeado.mercados[0].precios[0].recursoId).toBe('recurso.vino.tablet')
    expect(remapeado.caravanas[0].carga.recursoId).toBe('recurso.carbon.tablet')
  })

  it('alcanza el snapshotPrevio y no toca la clave fija de una categoría de coste', () => {
    const documento = documentoConCatalogos()
    const remapeado = remapearCatalogos(documento, remapeoDeTodo(documento))
    expect(remapeado.avances[0].snapshotPrevio?.movimientos[0].categoriaId).toBe('cat.comercio.tablet')
    expect(remapeado.eventos[0].efectos).toEqual([
      { ambito: 'consumo', objetivo: { tipo: 'recurso', id: 'recurso.lena.tablet' }, pct: 20 },
      { ambito: 'costes', objetivo: { tipo: 'categoriaCoste', id: 'salarios' }, pct: 10 },
    ])
    expect(documento.movimientos[0].categoriaId).toBe('cat.impuestos')
  })

  it('con un remapeo vacío devuelve el mismo documento', () => {
    const documento = documentoConCatalogos()
    expect(remapearCatalogos(documento, {})).toBe(documento)
  })

  it('recorre los mismos campos que catalogosUsados: después no queda ningún id viejo', () => {
    const documento = documentoConCatalogos()
    const usados = catalogosUsados(documento)
    const remapeado = remapearCatalogos(documento, remapeoDeTodo(documento))
    const despues = catalogosUsados(remapeado)
    expect(despues.opciones).toEqual(usados.opciones.map((id) => `${id}.tablet`))
    expect(despues.recursos).toEqual(usados.recursos.map((id) => `${id}.tablet`))
    const texto = JSON.stringify(remapeado)
    for (const id of [...usados.opciones, ...usados.recursos]) {
      expect(texto).not.toContain(`"${id}"`)
    }
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/copia/fusion.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./fusion`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/copia/fusion.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/copia/fusion.test.ts [ src/dominio/copia/fusion.test.ts ]
Error: Cannot find module './fusion' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/copia/fusion.test.ts
 ❯ src/dominio/copia/fusion.test.ts:12:1
     10| import type { DocumentoPartida, EstadoPartida } from '../modelo/docu…
     11| import type { Movimiento } from '../modelo/movimientos'
     12| import { fusionarCatalogos, lineasDeFusion, remapearCatalogos, type…
       | ^
     13| import { catalogosUsados } from './sobre'


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:38:07
   Duration  534ms (worker 96%, environment 2%)
```

- [ ] **Paso 3: Implementar `fusion.ts`**

Cuatro cosas que conviene leer antes de copiar el archivo:

1. **`ListaFusionada` = las seis listas más `'recursos'`.** El resumen tiene que poder decir «El recurso «Cal»», y `ListaCatalogo` solo tiene las seis listas de opciones. El tipo se declara aquí, y `NOMBRE_FUSIONADA` y `ARTICULO_FUSIONADA` extienden `NOMBRE_LISTA` y `ARTICULO_LISTA` de `modelo/catalogos.ts` con esa séptima entrada.
2. **El índice de nombres se va actualizando.** Cuando la fusión crea una opción propia, la mete en el índice: así dos opciones propias de la copia con el mismo nombre acaban las dos en la misma opción nueva, y no en dos.
3. **Un nombre distinto es un nombre distinto normalizado (§6.6).** «Alojamiento» y «alojamiento» no cuentan como cambio de nombre y no ensucian el resumen.
4. **Las unidades se anotan siempre que difieran**, tanto si el recurso se casó por id como si se unió por nombre: las cantidades guardadas dependen de ellas (regla 4 del contrato).

Crea `src/dominio/copia/fusion.ts` con este contenido:

```ts
import type { EfectoObra, Obra } from '../modelo/asentamiento'
import {
  ARTICULO_LISTA,
  NOMBRE_LISTA,
  type CambiosCatalogo,
  type CatalogoApp,
  type CatalogosEnCopia,
  type ListaCatalogo,
  type OpcionCatalogo,
  type OpcionEnCopia,
  type RecursoCatalogo,
  type RecursoEnCopia,
} from '../modelo/catalogos'
import type { Id } from '../modelo/comunes'
import type { DocumentoPartida, EstadoPartida } from '../modelo/documento'
import type { EfectoEvento } from '../modelo/eventos'
import { normalizarNombre } from '../texto/normalizar'

/** Las seis listas de opciones más los recursos: lo que nombra cada línea del resumen (§6.1). */
export type ListaFusionada = ListaCatalogo | 'recursos'

/** Nombre en singular de cada lista y de los recursos, para los mensajes: «La categoría …», «El recurso …». */
const NOMBRE_FUSIONADA: Readonly<Record<ListaFusionada, string>> = { ...NOMBRE_LISTA, recursos: 'recurso' }

/** Artículo de cada lista y de los recursos: «La» para categoría, «El» para las demás. */
const ARTICULO_FUSIONADA: Readonly<Record<ListaFusionada, 'La' | 'El'>> = { ...ARTICULO_LISTA, recursos: 'El' }

/** Lo que la fusión cambió, en datos, para armar las líneas del resumen y las pruebas (§6.1, decisión 7). */
export interface ResumenFusion {
  nombresConservados: { id: Id; lista: ListaFusionada; enLaCopia: string; enLaTablet: string }[]
  reactivadas: { id: Id; lista: ListaFusionada; nombre: string }[]
  unidasPorNombre: { idEnLaCopia: Id; id: Id; lista: ListaFusionada; nombre: string }[]
  creadas: { id: Id; lista: ListaFusionada; nombre: string; propia: boolean }[]
  unidadesConservadas: { id: Id; nombre: string; enLaCopia: string; enLaTablet: string }[]
}

/** Resultado de casar los catálogos de la copia con los de esta tablet. */
export interface ResultadoFusion {
  cambios: CambiosCatalogo
  remapeo: Record<Id, Id>
  resumen: ResumenFusion
}

/** Una opción de la copia con el id que le toca en esta tablet, lista para escribirse (decisión 7). */
function opcionParaLaTablet(opcion: OpcionEnCopia, id: Id): OpcionCatalogo {
  switch (opcion.lista) {
    case 'categorias':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'categorias',
        grupo: opcion.grupo,
        borrada: false,
      }
    case 'oficios':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'oficios',
        grupo: opcion.grupo,
        plural: opcion.plural,
        borrada: false,
      }
    case 'tiposEdificio':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'tiposEdificio',
        grupo: opcion.grupo,
        borrada: false,
      }
    case 'tiposUnidad':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'tiposUnidad',
        grupo: opcion.grupo,
        borrada: false,
      }
    case 'tiposDefensa':
      return { id, nombre: opcion.nombre, propia: opcion.propia, lista: 'tiposDefensa', borrada: false }
    case 'tiposAnimal':
      return {
        id,
        nombre: opcion.nombre,
        propia: opcion.propia,
        lista: 'tiposAnimal',
        grupo: opcion.grupo,
        borrada: false,
      }
  }
}

/** Un recurso de la copia con el id que le toca en esta tablet. `protegido` es de la app y no viaja (§6.1). */
function recursoParaLaTablet(recurso: RecursoEnCopia, id: Id): RecursoCatalogo {
  return {
    id,
    nombre: recurso.nombre,
    unidadSingular: recurso.unidadSingular,
    unidadPlural: recurso.unidadPlural,
    propia: recurso.propia,
    borrada: false,
  }
}

/** Las unidades de un recurso tal como se escriben en el resumen: «saco / sacos». */
function unidadesDe(recurso: { unidadSingular: string; unidadPlural: string }): string {
  return `${recurso.unidadSingular} / ${recurso.unidadPlural}`
}

/** Anota que las unidades de la copia difieren: mandan las de esta tablet, y las cantidades dependen de ellas. */
function anotarUnidades(enLaTablet: RecursoCatalogo, enLaCopia: RecursoEnCopia, resumen: ResumenFusion): void {
  if (
    enLaTablet.unidadSingular !== enLaCopia.unidadSingular ||
    enLaTablet.unidadPlural !== enLaCopia.unidadPlural
  ) {
    resumen.unidadesConservadas.push({
      id: enLaTablet.id,
      nombre: enLaTablet.nombre,
      enLaCopia: unidadesDe(enLaCopia),
      enLaTablet: unidadesDe(enLaTablet),
    })
  }
}

/**
 * Casa las opciones de la app por id y las tuyas por nombre normalizado en su lista, crea las que falten y
 * remapea (§6.1, decisión 7). `nuevoId` se recibe porque `crypto` es del navegador y el dominio es puro.
 */
export function fusionarCatalogos(
  enLaCopia: CatalogosEnCopia,
  enLaTablet: CatalogoApp,
  nuevoId: () => Id,
): ResultadoFusion {
  const cambios: CambiosCatalogo = {
    opcionesNuevas: [],
    recursosNuevos: [],
    opcionesReactivadas: [],
    recursosReactivados: [],
  }
  const remapeo: Record<Id, Id> = {}
  const resumen: ResumenFusion = {
    nombresConservados: [],
    reactivadas: [],
    unidasPorNombre: [],
    creadas: [],
    unidadesConservadas: [],
  }

  const opcionesPorId = new Map<Id, OpcionCatalogo>(enLaTablet.opciones.map((opcion) => [opcion.id, opcion]))
  // Candidatas a unirse por nombre: las no borradas de cada lista, más las que cree esta misma fusión.
  const opcionesPorNombre = new Map<ListaCatalogo, Map<string, Id>>()
  const indiceDe = (lista: ListaCatalogo): Map<string, Id> => {
    const indice = opcionesPorNombre.get(lista) ?? new Map<string, Id>()
    opcionesPorNombre.set(lista, indice)
    return indice
  }
  for (const opcion of enLaTablet.opciones) {
    if (!opcion.borrada) {
      indiceDe(opcion.lista).set(normalizarNombre(opcion.nombre), opcion.id)
    }
  }

  for (const opcion of enLaCopia.opciones) {
    if (!opcion.propia) {
      const enLaTabletPorId = opcionesPorId.get(opcion.id)
      if (enLaTabletPorId === undefined) {
        const creada = opcionParaLaTablet(opcion, opcion.id)
        cambios.opcionesNuevas.push(creada)
        opcionesPorId.set(creada.id, creada)
        indiceDe(creada.lista).set(normalizarNombre(creada.nombre), creada.id)
        resumen.creadas.push({ id: creada.id, lista: creada.lista, nombre: creada.nombre, propia: false })
        continue
      }
      if (normalizarNombre(enLaTabletPorId.nombre) !== normalizarNombre(opcion.nombre)) {
        resumen.nombresConservados.push({
          id: opcion.id,
          lista: opcion.lista,
          enLaCopia: opcion.nombre,
          enLaTablet: enLaTabletPorId.nombre,
        })
      }
      if (enLaTabletPorId.borrada) {
        cambios.opcionesReactivadas.push(opcion.id)
        resumen.reactivadas.push({ id: opcion.id, lista: opcion.lista, nombre: enLaTabletPorId.nombre })
        indiceDe(enLaTabletPorId.lista).set(normalizarNombre(enLaTabletPorId.nombre), enLaTabletPorId.id)
      }
      continue
    }
    const indice = indiceDe(opcion.lista)
    const clave = normalizarNombre(opcion.nombre)
    const idEnLaTablet = indice.get(clave)
    if (idEnLaTablet !== undefined) {
      const unida = opcionesPorId.get(idEnLaTablet)
      resumen.unidasPorNombre.push({
        idEnLaCopia: opcion.id,
        id: idEnLaTablet,
        lista: opcion.lista,
        nombre: unida === undefined ? opcion.nombre : unida.nombre,
      })
      if (idEnLaTablet !== opcion.id) {
        remapeo[opcion.id] = idEnLaTablet
      }
      continue
    }
    const id = nuevoId()
    const creada = opcionParaLaTablet(opcion, id)
    cambios.opcionesNuevas.push(creada)
    opcionesPorId.set(id, creada)
    indice.set(clave, id)
    resumen.creadas.push({ id, lista: creada.lista, nombre: creada.nombre, propia: true })
    if (id !== opcion.id) {
      remapeo[opcion.id] = id
    }
  }

  const recursosPorId = new Map<Id, RecursoCatalogo>(enLaTablet.recursos.map((recurso) => [recurso.id, recurso]))
  const recursosPorNombre = new Map<string, Id>()
  for (const recurso of enLaTablet.recursos) {
    if (!recurso.borrada) {
      recursosPorNombre.set(normalizarNombre(recurso.nombre), recurso.id)
    }
  }

  for (const recurso of enLaCopia.recursos) {
    if (!recurso.propia) {
      const enLaTabletPorId = recursosPorId.get(recurso.id)
      if (enLaTabletPorId === undefined) {
        const creado = recursoParaLaTablet(recurso, recurso.id)
        cambios.recursosNuevos.push(creado)
        recursosPorId.set(creado.id, creado)
        recursosPorNombre.set(normalizarNombre(creado.nombre), creado.id)
        resumen.creadas.push({ id: creado.id, lista: 'recursos', nombre: creado.nombre, propia: false })
        continue
      }
      if (normalizarNombre(enLaTabletPorId.nombre) !== normalizarNombre(recurso.nombre)) {
        resumen.nombresConservados.push({
          id: recurso.id,
          lista: 'recursos',
          enLaCopia: recurso.nombre,
          enLaTablet: enLaTabletPorId.nombre,
        })
      }
      anotarUnidades(enLaTabletPorId, recurso, resumen)
      if (enLaTabletPorId.borrada) {
        cambios.recursosReactivados.push(recurso.id)
        resumen.reactivadas.push({ id: recurso.id, lista: 'recursos', nombre: enLaTabletPorId.nombre })
        recursosPorNombre.set(normalizarNombre(enLaTabletPorId.nombre), enLaTabletPorId.id)
      }
      continue
    }
    const clave = normalizarNombre(recurso.nombre)
    const idEnLaTablet = recursosPorNombre.get(clave)
    if (idEnLaTablet !== undefined) {
      const unido = recursosPorId.get(idEnLaTablet)
      resumen.unidasPorNombre.push({
        idEnLaCopia: recurso.id,
        id: idEnLaTablet,
        lista: 'recursos',
        nombre: unido === undefined ? recurso.nombre : unido.nombre,
      })
      if (unido !== undefined) {
        anotarUnidades(unido, recurso, resumen)
      }
      if (idEnLaTablet !== recurso.id) {
        remapeo[recurso.id] = idEnLaTablet
      }
      continue
    }
    const id = nuevoId()
    const creado = recursoParaLaTablet(recurso, id)
    cambios.recursosNuevos.push(creado)
    recursosPorId.set(id, creado)
    recursosPorNombre.set(clave, id)
    resumen.creadas.push({ id, lista: 'recursos', nombre: creado.nombre, propia: true })
    if (id !== recurso.id) {
      remapeo[recurso.id] = id
    }
  }

  return { cambios, remapeo, resumen }
}

/** El efecto de una obra con sus ids de catálogo remapeados; los objetivoId son de registros y no se tocan. */
function remapearEfectoObra(efecto: EfectoObra, cambiar: (id: Id) => Id): EfectoObra {
  switch (efecto.tipo) {
    case 'crearEdificio':
      return { tipo: 'crearEdificio', tipoId: cambiar(efecto.tipoId) }
    case 'crearDefensa':
      return { tipo: 'crearDefensa', tipoId: cambiar(efecto.tipoId) }
    case 'ampliarAlmacen':
      return { tipo: 'ampliarAlmacen', recursoId: cambiar(efecto.recursoId), valor: efecto.valor }
    default:
      return efecto
  }
}

/** El efecto de un evento; solo el objetivo «recurso» es de catálogo: «categoriaCoste» es una clave fija. */
function remapearEfectoEvento(efecto: EfectoEvento, cambiar: (id: Id) => Id): EfectoEvento {
  if (efecto.ambito !== 'consumo' || efecto.objetivo.tipo !== 'recurso') {
    return efecto
  }
  return { ambito: 'consumo', objetivo: { tipo: 'recurso', id: cambiar(efecto.objetivo.id) }, pct: efecto.pct }
}

/** Los materiales de una obra, que llevan el recurso en la **clave** del objeto (decisión 13). */
function remapearMateriales(materiales: Obra['materiales'], cambiar: (id: Id) => Id): Obra['materiales'] {
  const remapeados: Record<Id, number> = {}
  for (const [recursoId, cantidad] of Object.entries(materiales)) {
    if (cantidad !== undefined) {
      remapeados[cambiar(recursoId)] = cantidad
    }
  }
  return remapeados
}

/** Los 20 campos de catálogo de un estado, con sus ids cambiados (`contrato-datos.md` §2.9). */
function remapearEstado(estado: EstadoPartida, cambiar: (id: Id) => Id): EstadoPartida {
  return {
    ...estado,
    movimientos: estado.movimientos.map((movimiento) => ({
      ...movimiento,
      categoriaId: cambiar(movimiento.categoriaId),
    })),
    recurrentes: estado.recurrentes.map((recurrente) => ({
      ...recurrente,
      categoriaId: cambiar(recurrente.categoriaId),
    })),
    impuestosRentas: estado.impuestosRentas.map((impuesto) => ({
      ...impuesto,
      categoriaId: cambiar(impuesto.categoriaId),
    })),
    trabajadores: estado.trabajadores.map((trabajador) => ({
      ...trabajador,
      oficioId: cambiar(trabajador.oficioId),
    })),
    edificios: estado.edificios.map((edificio) => ({
      ...edificio,
      tipoId: cambiar(edificio.tipoId),
      producciones: edificio.producciones.map((produccion) => ({
        ...produccion,
        recursoId: cambiar(produccion.recursoId),
      })),
    })),
    unidadesGuarnicion: estado.unidadesGuarnicion.map((unidad) => ({ ...unidad, tipoId: cambiar(unidad.tipoId) })),
    defensas: estado.defensas.map((defensa) => ({ ...defensa, tipoId: cambiar(defensa.tipoId) })),
    animales: estado.animales.map((animal) => ({ ...animal, tipoId: cambiar(animal.tipoId) })),
    obras: estado.obras.map((obra) => ({
      ...obra,
      materiales: remapearMateriales(obra.materiales, cambiar),
      efecto: remapearEfectoObra(obra.efecto, cambiar),
    })),
    poblaciones: estado.poblaciones.map((poblacion) => ({
      ...poblacion,
      consumos: poblacion.consumos.map((consumo) => ({ ...consumo, recursoId: cambiar(consumo.recursoId) })),
    })),
    existencias: estado.existencias.map((existencia) => ({
      ...existencia,
      recursoId: cambiar(existencia.recursoId),
    })),
    ajustesExistencias: estado.ajustesExistencias.map((ajuste) => ({
      ...ajuste,
      recursoId: cambiar(ajuste.recursoId),
    })),
    entradasAlmacen: estado.entradasAlmacen.map((entrada) => ({
      ...entrada,
      recursoId: cambiar(entrada.recursoId),
    })),
    produccionesRealizadas: estado.produccionesRealizadas.map((produccion) => ({
      ...produccion,
      recursoId: cambiar(produccion.recursoId),
    })),
    mercados: estado.mercados.map((mercado) => ({
      ...mercado,
      precios: mercado.precios.map((precio) => ({ ...precio, recursoId: cambiar(precio.recursoId) })),
    })),
    caravanas: estado.caravanas.map((caravana) => ({
      ...caravana,
      carga: { ...caravana.carga, recursoId: cambiar(caravana.carga.recursoId) },
    })),
    eventos: estado.eventos.map((evento) => ({
      ...evento,
      efectos: evento.efectos.map((efecto) => remapearEfectoEvento(efecto, cambiar)),
    })),
  }
}

/** Aplica el remapeo a todos los campos de catálogo del documento y de su snapshotPrevio (§6.1). */
export function remapearCatalogos(documento: DocumentoPartida, remapeo: Record<Id, Id>): DocumentoPartida {
  if (Object.keys(remapeo).length === 0) {
    return documento
  }
  const cambiar = (id: Id): Id => remapeo[id] ?? id
  const avances = documento.avances.map((avance) =>
    avance.snapshotPrevio === undefined
      ? avance
      : { ...avance, snapshotPrevio: remapearEstado(avance.snapshotPrevio, cambiar) },
  )
  return { ...remapearEstado(documento, cambiar), avances }
}

/** Las líneas del resumen de importación, en castellano y en orden fijo (§6.1, `contrato-datos.md` §3.4). */
export function lineasDeFusion(resumen: ResumenFusion): string[] {
  const lineas: string[] = []
  for (const conservado of resumen.nombresConservados) {
    const lista = `${ARTICULO_FUSIONADA[conservado.lista]} ${NOMBRE_FUSIONADA[conservado.lista]}`
    lineas.push(
      `${lista} «${conservado.enLaTablet}» se llama «${conservado.enLaCopia}» en la copia: ` +
        'se conserva el nombre de esta tablet.',
    )
  }
  for (const reactivada of resumen.reactivadas) {
    const articulo = ARTICULO_FUSIONADA[reactivada.lista]
    const lista = `${articulo.toLowerCase()} ${NOMBRE_FUSIONADA[reactivada.lista]}`
    // «la categoría … eliminada», «el oficio … eliminado».
    const terminacion = articulo === 'La' ? 'a' : 'o'
    lineas.push(`Se ha recuperado ${lista} «${reactivada.nombre}», que estaba eliminad${terminacion}.`)
  }
  for (const unida of resumen.unidasPorNombre) {
    const lista = `${ARTICULO_FUSIONADA[unida.lista]} ${NOMBRE_FUSIONADA[unida.lista]}`
    lineas.push(`${lista} «${unida.nombre}» de la copia se ha unido a la tuya con el mismo nombre.`)
  }
  for (const creada of resumen.creadas) {
    const nombreDeLista = NOMBRE_FUSIONADA[creada.lista]
    if (creada.propia) {
      lineas.push(`Se ha añadido tu ${nombreDeLista} «${creada.nombre}».`)
    } else {
      const articulo = ARTICULO_FUSIONADA[creada.lista].toLowerCase()
      lineas.push(`Se ha añadido ${articulo} ${nombreDeLista} «${creada.nombre}», que esta tablet no tenía.`)
    }
  }
  for (const unidades of resumen.unidadesConservadas) {
    lineas.push(
      `El recurso «${unidades.nombre}» se mide aquí en «${unidades.enLaTablet}» y en la copia en ` +
        `«${unidades.enLaCopia}»: se conservan las unidades de esta tablet.`,
    )
  }
  return lineas
}
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/copia/fusion.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/dominio/copia/fusion.test.ts (15 tests) 48ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  12:44:26
   Duration  688ms (transform 47%, import 30%, worker 10%, tests 7%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que a `opcionParaLaTablet` le falta una de las seis listas (el `switch` sin `default` obliga a cubrirlas todas para que la función devuelva siempre un `OpcionCatalogo`) y que `remapearEstado` sigue devolviendo las 34 claves del estado; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **488 pruebas en 41 archivos**. La tarea 15 dejó 472 pruebas en 40 archivos, y esta tarea trae **16 nuevas**: 15 de `fusion.test.ts` y **una más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `src/dominio/copia/fusion.ts`:

```text
 Test Files  41 passed (41)
      Tests  488 passed (488)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/copia/fusion.ts src/dominio/copia/fusion.test.ts
git commit -m "feat(copia): fusión de catálogos, remapeo de los registros y resumen de la fusión" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/copia/fusion.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/copia/fusion.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 2f8c6b0] feat(copia): fusión de catálogos, remapeo de los registros y resumen de la fusión
 2 files changed, 1108 insertions(+)
 create mode 100644 src/dominio/copia/fusion.test.ts
 create mode 100644 src/dominio/copia/fusion.ts
```

---

### Tarea 17 · Importar copia: reemplazar e importar como copia

Esta es la tarea que escribe en la base lo que las tres anteriores han preparado: mira si la partida de la copia ya está guardada y qué se puede hacer con ella, fusiona los catálogos, remapea los registros y guarda la partida, su resumen y las altas del catálogo **en una sola transacción** (decisión 14). Todo vive en `src/datos/copia/importar.ts`, porque toca IndexedDB; lo puro ya está hecho.

Depende de la tarea 16 (`fusionarCatalogos`, `remapearCatalogos`, `lineasDeFusion`), y usa además `comoCopia` y `nombreDeCopia` (tarea 15), `resumenDePartida` (tarea 6), `leerCatalogo` y `escribirCatalogo` (tarea 11) y `listarPartidas` (tarea 10). La copia le llega ya analizada y validada por `analizarCopia` (tarea 15): aquí no se vuelve a validar nada.

**Reglas de la especificación que implementa:**

- **Desde dónde se importa (§6.1).** «Desde P0 se añade. Si ya existe la misma partida (mismo id), pregunta “Reemplazar” o “Importar como copia”. Desde P6 reemplaza la partida actual, con confirmación, y **solo admite copias de esa partida**.»
- **Una sola transacción (decisión 14).** «La partida y los catálogos se escriben en una sola transacción.» Leer el catálogo, fusionar y remapear se hace **fuera**: dentro de `db.transaction` solo pueden ir operaciones de IndexedDB, o salta `PrematureCommitError` (`tecnica.md` §6.2).
- **El resumen lo dice (§6.1).** «Una copia con versionFormato menor se migra al importar, y **el resumen lo dice**», y la fusión de catálogos también: las líneas van en el orden del contrato (`contrato-datos.md` §3.4), primero la del modo, después la de la migración y por último las de la fusión.
- **«Importar como copia» (§6.1).** La partida duplicada estrena id (`nuevoId()`, decisión 8) y nombre («… (copia)», «… (copia 2)»), y conserva todo lo demás; lo hace `comoCopia` (tarea 15).
- **`abiertaEl` es de esta tablet (decisión 9).** La fila de resumen de la partida importada nace con `abiertaEl = ahora`; `creada` y `actualizada` son las de la copia, porque son del estado.
- **Rechazo desde P6 (contrato §3.1).** «Esta copia es de otra partida» es del contrato, no de la especificación, que no redacta ese mensaje.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/datos/copia/importar.ts`
- Prueba: `src/datos/copia/importar.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba trabaja sobre la base de verdad: `baseDePrueba()` (tarea 9) con su `IDBFactory` nueva y el catálogo de fábrica sembrado (tarea 11). Los sobres se arman a mano, y no con `armarCopia`, para controlar exactamente qué catálogos viajan en cada caso.

Qué comprueba cada bloque:
- `examinarDestino`: los cuatro casos de §6.1 (base vacía, partida ya guardada, P6 con su partida y P6 con otra).
- `importarCopia`: los tres modos, la fusión que crea una opción propia y la que la une a la de esta tablet, la opción de la app borrada que se reactiva, el resumen con sus líneas y la transacción que se deshace entera si la escritura falla.

La categoría propia **«Posadas del camino»** (la de J2e) es la que ejercita la fusión: la ida y vuelta del entregable (tarea 21) no la toca, porque la partida de ejemplo no tiene ninguna opción propia (aviso 3 del contrato).

Crea `src/datos/copia/importar.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MARCA_COPIA, type SobreCopia } from '../../dominio/copia/sobre'
import type { CatalogosEnCopia, OpcionCatalogo } from '../../dominio/modelo/catalogos'
import type { Id } from '../../dominio/modelo/comunes'
import type { DocumentoPartida } from '../../dominio/modelo/documento'
import type { Movimiento } from '../../dominio/modelo/movimientos'
import { VERSION_FORMATO } from '../../dominio/modelo/partida'
import type { BaseDeDatos } from '../baseDeDatos'
import { sembrarCatalogo } from '../catalogos'
import { baseDePrueba } from '../pruebas/baseDePrueba'
import { crearPartida } from '../repositorio'
import { examinarDestino, importarCopia } from './importar'

/** Cuándo se exportó la copia y cuándo se importa. */
const EXPORTADA_EL = '2026-09-17T18:30:00.000Z'
const AHORA = '2026-09-18T07:00:00.000Z'

let db: BaseDeDatos

beforeEach(() => {
  db = baseDePrueba()
})

afterEach(() => {
  db.close()
})

/** Ids nuevos y predecibles: id.nuevo.1, id.nuevo.2… En la app los da nuevoId() (tarea 9). */
function idsDePrueba(): () => Id {
  let cuantos = 0
  return () => {
    cuantos += 1
    return `id.nuevo.${cuantos}`
  }
}

/** Un movimiento suelto, para colgarle la categoría de cada prueba. */
function movimientoBase(id: string, dominioId: string): Movimiento {
  return {
    id,
    dominioId,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: 'cat.impuestos',
    concepto: 'Posada del camino · 7 noches',
    origen: 'manual',
    programado: false,
  }
}

/** Un documento válido y mínimo: el personaje, un asentamiento y lo que la validación exige de cada asentamiento. */
function documentoMinimo(id: Id = 'p.sombra-del-este', nombre = 'La Sombra del Este'): DocumentoPartida {
  return {
    partida: {
      id,
      nombre,
      edad: 'tercera',
      equivalencias: { mmEnMo: 100, moEnMp: 10, mpEnMb: 10, mbEnMc: 10, mcEnMe: 10, meEnMh: 10 },
      kgPorSaco: 30,
      diasPorSaco: 30,
      fechaInicial: { anio: 1640, mes: 3, dia: 31 },
      fechaActual: { anio: 1640, mes: 4, dia: 12 },
      creada: '2026-09-17T08:00:00.000Z',
      actualizada: '2026-09-17T09:00:00.000Z',
      versionFormato: 1,
      cambiosDesdeUltimoAvance: 0,
    },
    dominios: [
      { id: 'dom.tharan', tipo: 'personaje', nombre: 'Tharan' },
      {
        id: 'dom.bree',
        tipo: 'asentamiento',
        nombre: 'Bree',
        categoria: 'pueblo',
        alta: { anio: 1640, mes: 3, dia: 31 },
      },
    ],
    cajas: [
      { dominioId: 'dom.tharan', saldoInicial: { base: 4091800 } },
      { dominioId: 'dom.bree', saldoInicial: { base: 34000000 } },
    ],
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
    poblaciones: [{ dominioId: 'dom.bree', habitantesIniciales: 1214, cambios: [], consumos: [] }],
    existencias: [{ dominioId: 'dom.bree', recursoId: 'recurso.viveres', cantidad: 890 }],
    ajustesExistencias: [],
    entradasAlmacen: [],
    edificios: [],
    produccionesRealizadas: [],
    trabajadores: [],
    obras: [],
    impuestosRentas: [],
    tiposLocal: [],
    localesComerciales: [],
    mercados: [{ id: 'mer.bree', nombre: 'Bree', localDe: 'dom.bree', precios: [] }],
    rutas: [],
    caravanas: [],
    unidadesGuarnicion: [],
    defensas: [],
    animales: [],
    armeria: [],
    eventos: [],
    ubicaciones: [],
    personas: [],
    avances: [
      {
        id: 'av.1',
        desde: { anio: 1640, mes: 3, dia: 31 },
        hasta: { anio: 1640, mes: 4, dia: 12 },
        aplicadoEl: '2026-09-17T09:00:00.000Z',
        cambios: [],
        avisos: [],
      },
    ],
  }
}

/** El documento de la copia, con un movimiento de la categoría que se le diga. */
function documentoCon(categoriaId: Id): DocumentoPartida {
  const documento = documentoMinimo()
  documento.movimientos = [{ ...movimientoBase('mov.posada', 'dom.bree'), categoriaId }]
  return documento
}

/** El recurso de la partida, que viaja en toda copia porque el almacén tiene su fila (§6.6). */
function viveresEnCopia(): CatalogosEnCopia['recursos'][number] {
  return { id: 'recurso.viveres', nombre: 'Víveres', unidadSingular: 'saco', unidadPlural: 'sacos', propia: false }
}

/** Los catálogos de una copia que solo usa opciones de la app. */
function catalogosDeLaApp(): CatalogosEnCopia {
  return {
    opciones: [
      { id: 'cat.impuestos', nombre: 'Impuestos', propia: false, lista: 'categorias', grupo: 'asentamientos' },
    ],
    recursos: [viveresEnCopia()],
  }
}

/** Los catálogos de una copia con la categoría propia «Posadas del camino» (decisión 7, J2e). */
function catalogosConCategoriaPropia(): CatalogosEnCopia {
  return {
    opciones: [
      { id: 'cat.copia.posadas', nombre: 'Posadas del camino', propia: true, lista: 'categorias', grupo: 'tuyas' },
    ],
    recursos: [viveresEnCopia()],
  }
}

/** Un sobre armado a mano: así cada prueba controla exactamente qué catálogos viajan. */
function sobreDe(documento: DocumentoPartida, catalogos: CatalogosEnCopia): SobreCopia {
  return {
    app: MARCA_COPIA,
    versionFormato: VERSION_FORMATO,
    exportadaEl: EXPORTADA_EL,
    partida: documento,
    catalogos,
  }
}

describe('examinarDestino', () => {
  it('en una base vacía, desde el selector, solo se puede añadir', async () => {
    await sembrarCatalogo(db)
    const destino = await examinarDestino(db, sobreDe(documentoMinimo(), catalogosDeLaApp()), 'selector')
    expect(destino).toEqual({ yaExiste: false, modos: ['nueva'] })
  })

  it('con la partida ya guardada, desde el selector, ofrece reemplazar o importar como copia', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const destino = await examinarDestino(db, sobreDe(documentoMinimo(), catalogosDeLaApp()), 'selector')
    expect(destino).toEqual({
      yaExiste: true,
      nombreExistente: 'La Sombra del Este',
      modos: ['reemplazar', 'comoCopia'],
    })
  })

  it('desde ajustes, la copia de la partida abierta solo puede reemplazarla (§6.1)', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoMinimo(), catalogosDeLaApp())
    const destino = await examinarDestino(db, copia, 'ajustes', 'p.sombra-del-este')
    expect(destino).toEqual({ yaExiste: true, nombreExistente: 'La Sombra del Este', modos: ['reemplazar'] })
  })

  it('desde ajustes, la copia de otra partida se rechaza con el mensaje del contrato', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoMinimo(), catalogosDeLaApp())
    const destino = await examinarDestino(db, copia, 'ajustes', 'p.otra-partida')
    expect(destino).toEqual({
      yaExiste: false,
      modos: [],
      rechazo: { motivo: 'otraPartida', mensaje: 'Esta copia es de otra partida' },
    })
  })
})

describe('importarCopia', () => {
  it('en una base vacía guarda la partida, su resumen con abiertaEl y la línea del modo', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.partidaId).toBe('p.sombra-del-este')
    expect(resultado.lineas).toEqual(['Se ha añadido la partida «La Sombra del Este».'])
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos[0].categoriaId).toBe('cat.impuestos')
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.abiertaEl).toBe(AHORA)
    expect(resumen?.actualizada).toBe('2026-09-17T09:00:00.000Z')
    expect(resumen?.dominios).toEqual(['Tharan', 'Bree'])
  })

  it('«Reemplazar» deja una sola partida, con el estado de la copia', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'reemplazar', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.lineas[0]).toBe('Se ha reemplazado la partida «La Sombra del Este».')
    expect(await db.partidas.count()).toBe(1)
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos).toHaveLength(1)
    const resumen = await db.resumenes.get('p.sombra-del-este')
    expect(resumen?.abiertaEl).toBe(AHORA)
    expect(resumen?.exportadaEl).toBeUndefined()
  })

  it('«Importar como copia» deja dos partidas, con id y nombre nuevos', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo(), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'comoCopia', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.partidaId).toBe('id.nuevo.1')
    expect(resultado.nombre).toBe('La Sombra del Este (copia)')
    expect(resultado.lineas[0]).toBe('Se ha importado como copia: «La Sombra del Este (copia)».')
    expect(await db.partidas.count()).toBe(2)
    const nueva = await db.partidas.get('id.nuevo.1')
    expect(nueva?.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(nueva?.partida.creada).toBe('2026-09-17T08:00:00.000Z')
    const vieja = await db.partidas.get('p.sombra-del-este')
    expect(vieja?.partida.nombre).toBe('La Sombra del Este')
  })

  it('la categoría propia de la copia se crea con id nuevo y el movimiento importado la sigue', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    const creada = await db.opcionesCatalogo.get('id.nuevo.1')
    expect(creada).toEqual({
      id: 'id.nuevo.1',
      nombre: 'Posadas del camino',
      propia: true,
      lista: 'categorias',
      grupo: 'tuyas',
      borrada: false,
    })
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos[0].categoriaId).toBe('id.nuevo.1')
    expect(resultado.lineas).toContain('Se ha añadido tu categoría «Posadas del camino».')
  })

  it('la categoría propia se une a la de esta tablet por nombre normalizado y no se duplica', async () => {
    await sembrarCatalogo(db)
    const posadasDeLaTablet: OpcionCatalogo = {
      id: 'cat.mias.posadas',
      nombre: 'Posadas del Camino',
      propia: true,
      lista: 'categorias',
      grupo: 'tuyas',
      borrada: false,
    }
    await db.opcionesCatalogo.put(posadasDeLaTablet)
    const antes = await db.opcionesCatalogo.count()
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(await db.opcionesCatalogo.count()).toBe(antes)
    const guardada = await db.partidas.get('p.sombra-del-este')
    expect(guardada?.movimientos[0].categoriaId).toBe('cat.mias.posadas')
    expect(resultado.lineas).toContain(
      'La categoría «Posadas del Camino» de la copia se ha unido a la tuya con el mismo nombre.',
    )
  })

  it('una opción de la app que estaba eliminada se reactiva (decisión 7)', async () => {
    await sembrarCatalogo(db)
    await db.opcionesCatalogo
      .where('id')
      .equals('cat.impuestos')
      .modify((opcion) => {
        opcion.borrada = true
      })
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect((await db.opcionesCatalogo.get('cat.impuestos'))?.borrada).toBe(false)
    expect(resultado.lineas).toContain('Se ha recuperado la categoría «Impuestos», que estaba eliminada.')
  })

  it('las líneas van en orden: el modo, la migración y la fusión', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, {
      modo: 'nueva',
      ahora: AHORA,
      nuevoId: idsDePrueba(),
      migrada: true,
      desdeVersion: 0,
    })
    expect(resultado.lineas).toEqual([
      'Se ha añadido la partida «La Sombra del Este».',
      'La copia venía en el formato 0 y se ha actualizado al formato 1.',
      'Se ha añadido tu categoría «Posadas del camino».',
    ])
  })

  it('el resumen dice qué partida se ha importado, con qué modo y sin migración', async () => {
    await sembrarCatalogo(db)
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    const resultado = await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(resultado.partidaId).toBe('p.sombra-del-este')
    expect(resultado.nombre).toBe('La Sombra del Este')
    expect(resultado.modo).toBe('nueva')
    expect(resultado.migrada).toBe(false)
    expect(resultado.desdeVersion).toBeUndefined()
    expect(resultado.fusion.creadas).toEqual([
      { id: 'id.nuevo.1', lista: 'categorias', nombre: 'Posadas del camino', propia: true },
    ])
  })

  it('si la escritura falla a mitad, la transacción deja el catálogo como estaba', async () => {
    await sembrarCatalogo(db)
    const opcionesAntes = await db.opcionesCatalogo.count()
    const copia = sobreDe(documentoCon('cat.copia.posadas'), catalogosConCategoriaPropia())
    // Una función no se puede clonar en IndexedDB: el put de la partida falla después de escribir el catálogo.
    const partida = copia.partida.partida as unknown as Record<string, unknown>
    partida.creada = () => '2026-09-17T08:00:00.000Z'
    await expect(
      importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() }),
    ).rejects.toThrow()
    expect(await db.partidas.count()).toBe(0)
    expect(await db.resumenes.count()).toBe(0)
    expect(await db.opcionesCatalogo.count()).toBe(opcionesAntes)
    expect(await db.opcionesCatalogo.get('id.nuevo.1')).toBeUndefined()
  })

  it('no toca las demás partidas guardadas', async () => {
    await sembrarCatalogo(db)
    await crearPartida(db, documentoMinimo('p.otra', 'Los Puertos Grises'), '2026-09-17T09:30:00.000Z')
    const copia = sobreDe(documentoCon('cat.impuestos'), catalogosDeLaApp())
    await importarCopia(db, copia, { modo: 'nueva', ahora: AHORA, nuevoId: idsDePrueba() })
    expect(await db.partidas.count()).toBe(2)
    const otra = await db.partidas.get('p.otra')
    expect(otra?.partida.nombre).toBe('Los Puertos Grises')
    const resumen = await db.resumenes.get('p.otra')
    expect(resumen?.abiertaEl).toBe('2026-09-17T09:30:00.000Z')
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/datos/copia/importar.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./importar`, que todavía no existe. La hora, la duración y el corte de las líneas de código citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/datos/copia/importar.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/datos/copia/importar.test.ts [ src/datos/copia/importar.test.ts ]
Error: Cannot find module './importar' imported from C:/Proyectos/GA/gestion_aldeas/src/datos/copia/importar.test.ts
 ❯ src/datos/copia/importar.test.ts:12:1
     10| import { baseDePrueba } from '../pruebas/baseDePrueba'
     11| import { crearPartida } from '../repositorio'
     12| import { examinarDestino, importarCopia } from './importar'
       | ^
     13|
     14| /** Cuándo se exportó la copia y cuándo se importa. */


 Test Files  1 failed (1)
      Tests  no tests
   Start at  12:56:13
   Duration  563ms (worker 94%, environment 2%)
```

- [ ] **Paso 3: Implementar `importar.ts`**

Tres cosas que conviene leer antes de copiar el archivo:

1. **El orden es el del contrato (`contrato-datos.md` §2.8):** leer el catálogo → `fusionarCatalogos` → `remapearCatalogos` → si el modo es `comoCopia`, `comoCopia(...)` con `nombreDeCopia(...)` → y solo entonces la transacción `rw` sobre las **cuatro** tablas, con `escribirCatalogo` y los dos `put`. Todo lo demás pasa fuera.
2. **`escribirCatalogo` abre su propia transacción** (tarea 11), pero Dexie la **anida** en la de fuera porque el ámbito de aquella incluye sus dos tablas: todo se confirma o se deshace junto.
3. **El resumen importado nace sin `exportadaEl`.** Una copia recién importada no se ha exportado desde esta tablet; la «Última copia exportada» de P6 vuelve a contarse desde cero (decisión 9).

Crea `src/datos/copia/importar.ts` con este contenido:

```ts
import { comoCopia, nombreDeCopia } from '../../dominio/copia/comoCopia'
import {
  fusionarCatalogos,
  lineasDeFusion,
  remapearCatalogos,
  type ResumenFusion,
} from '../../dominio/copia/fusion'
import type { SobreCopia } from '../../dominio/copia/sobre'
import type { Id, Instante } from '../../dominio/modelo/comunes'
import { VERSION_FORMATO } from '../../dominio/modelo/partida'
import { resumenDePartida } from '../../dominio/modelo/resumen'
import type { BaseDeDatos } from '../baseDeDatos'
import { escribirCatalogo, leerCatalogo } from '../catalogos'
import { listarPartidas } from '../repositorio'

/** Desde dónde se importa: P0 añade o pregunta; P6 solo admite copias de la partida abierta (§6.1). */
export type OrigenImportacion = 'selector' | 'ajustes'

/** Qué se hace con la copia. */
export type ModoImportacion = 'nueva' | 'reemplazar' | 'comoCopia'

/** Desde P6, una copia de otra partida no se importa (contrato §3.1: §6.1 no redacta el mensaje). */
const MENSAJE_OTRA_PARTIDA = 'Esta copia es de otra partida'

/** Qué puede hacer la app con esta copia, para plantear la pregunta de P0 o el rechazo de P6. */
export interface DestinoImportacion {
  yaExiste: boolean
  nombreExistente?: string
  modos: ModoImportacion[]
  rechazo?: { motivo: 'otraPartida'; mensaje: string }
}

/** Mira si la partida de la copia ya está guardada y devuelve los modos que se pueden ofrecer (§6.1). */
export async function examinarDestino(
  db: BaseDeDatos,
  copia: SobreCopia,
  origen: OrigenImportacion,
  partidaActualId?: Id,
): Promise<DestinoImportacion> {
  const id = copia.partida.partida.id
  const guardada = await db.resumenes.get(id)
  const yaExiste = guardada !== undefined
  if (origen === 'ajustes') {
    if (id !== partidaActualId) {
      return {
        yaExiste,
        nombreExistente: guardada?.nombre,
        modos: [],
        rechazo: { motivo: 'otraPartida', mensaje: MENSAJE_OTRA_PARTIDA },
      }
    }
    return { yaExiste, nombreExistente: guardada?.nombre, modos: ['reemplazar'] }
  }
  if (yaExiste) {
    return { yaExiste, nombreExistente: guardada?.nombre, modos: ['reemplazar', 'comoCopia'] }
  }
  return { yaExiste, modos: ['nueva'] }
}

/** Lo que hay que pasarle a la importación; nuevoId se inyecta para que el dominio no toque crypto. */
export interface OpcionesImportacion {
  modo: ModoImportacion
  ahora: Instante
  nuevoId: () => Id
  migrada?: boolean
  desdeVersion?: number
}

/** Lo que cuenta la app al terminar de importar (§6.1, «el resumen lo dice»). */
export interface ResumenImportacion {
  partidaId: Id
  nombre: string
  modo: ModoImportacion
  migrada: boolean
  desdeVersion?: number
  fusion: ResumenFusion
  lineas: string[]
}

/** La línea del modo, la de la migración (si la hubo) y las de la fusión, en ese orden (contrato §3.4). */
function lineasDeLaImportacion(nombre: string, opciones: OpcionesImportacion, fusion: ResumenFusion): string[] {
  const lineas: string[] = []
  if (opciones.modo === 'comoCopia') {
    lineas.push(`Se ha importado como copia: «${nombre}».`)
  } else if (opciones.modo === 'reemplazar') {
    lineas.push(`Se ha reemplazado la partida «${nombre}».`)
  } else {
    lineas.push(`Se ha añadido la partida «${nombre}».`)
  }
  if (opciones.migrada === true && opciones.desdeVersion !== undefined) {
    lineas.push(
      `La copia venía en el formato ${opciones.desdeVersion} y se ha actualizado al formato ${VERSION_FORMATO}.`,
    )
  }
  return [...lineas, ...lineasDeFusion(fusion)]
}

/**
 * Fusiona los catálogos, remapea los ids y escribe la partida y el catálogo en una sola transacción (§6.1,
 * decisión 14). La copia llega ya validada por analizarCopia (tarea 15): aquí no se vuelve a validar.
 */
export async function importarCopia(
  db: BaseDeDatos,
  copia: SobreCopia,
  opciones: OpcionesImportacion,
): Promise<ResumenImportacion> {
  const catalogo = await leerCatalogo(db)
  const fusion = fusionarCatalogos(copia.catalogos, catalogo, opciones.nuevoId)
  let documento = remapearCatalogos(copia.partida, fusion.remapeo)
  if (opciones.modo === 'comoCopia') {
    const nombres = (await listarPartidas(db)).map((resumen) => resumen.nombre)
    documento = comoCopia(documento, opciones.nuevoId(), nombreDeCopia(documento.partida.nombre, nombres))
  }
  // El resumen se arma fuera: dentro de la transacción solo pueden ir operaciones de IndexedDB.
  const resumen = resumenDePartida(documento, { abiertaEl: opciones.ahora })
  const guardado = documento
  await db.transaction('rw', db.partidas, db.resumenes, db.opcionesCatalogo, db.recursosCatalogo, async () => {
    await escribirCatalogo(db, fusion.cambios)
    await db.partidas.put(guardado)
    await db.resumenes.put(resumen)
  })
  return {
    partidaId: guardado.partida.id,
    nombre: guardado.partida.nombre,
    modo: opciones.modo,
    migrada: opciones.migrada ?? false,
    desdeVersion: opciones.desdeVersion,
    fusion: fusion.resumen,
    lineas: lineasDeLaImportacion(guardado.partida.nombre, opciones, fusion.resumen),
  }
}
```

- `examinarDestino` mira la tabla `resumenes`, que es la que tiene el nombre guardado sin cargar el documento entero.
- Desde `ajustes`, una copia solo se acepta si su partida es la abierta: sin `partidaActualId` no hay partida abierta y el rechazo es el mismo.
- La transacción abarca las cuatro tablas que se escriben; si el `put` de la partida falla, las altas del catálogo se deshacen con ella.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/copia/importar.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/datos/copia/importar.test.ts (14 tests) 421ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  13:01:38
   Duration  1.12s (transform 31%, import 22%, worker 12%, tests 29%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que `db.transaction` no declara alguna de las cuatro tablas que se escriben dentro o que `resumenDePartida` no recibe lo que espera; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **502 pruebas en 42 archivos**. La tarea 16 dejó 488 pruebas en 41 archivos, y esta tarea trae **14 nuevas**, todas de `importar.test.ts`: `pureza.test.ts` no crece, porque `src/datos/copia/importar.ts` no es del dominio:

```text
 Test Files  42 passed (42)
      Tests  502 passed (502)
```

- [ ] **Paso 6: Commit**

```bash
git add src/datos/copia/importar.ts src/datos/copia/importar.test.ts
git commit -m "feat(datos): importar una copia, con reemplazar e importar como copia" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/datos/copia/importar.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/datos/copia/importar.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 6b4e8d2] feat(datos): importar una copia, con reemplazar e importar como copia
 2 files changed, 496 insertions(+)
 create mode 100644 src/datos/copia/importar.test.ts
 create mode 100644 src/datos/copia/importar.ts
```

---

### Tarea 18 · Ejemplo: partida y personaje

Esta tarea escribe el principio de «La Sombra del Este», la partida de ejemplo que usarán las pruebas del motor de las fases 3 a 5 y el entregable de esta fase: la cabecera de la partida, los tres dominios, la bolsa de Tharan con su libro entero, sus deudas, sus gastos recurrentes, su inventario, sus inversiones y sus hechizos. El ejemplo vive en `src/dominio/ejemplo` porque es un valor **puro**: no toca IndexedDB y se puede importar desde cualquier prueba.

Depende de la tarea 8, que deja escritos `CATEGORIA`, `RECURSO` e `idDeOpcion` en `catalogo/inicial.ts`, y de la tarea 12, que deja `saldoDeCaja` en `dinero/saldo.ts`. De la fase 1 reutiliza `EQUIVALENCIAS_POR_DEFECTO`, `aBase`, `formatearOro` y `compararFechas`. Los ids van en un archivo aparte, `ids.ts`, porque los comparten las tareas 19 y 20.

**La cifra que manda es la bolsa de Tharan: 4.651.800 mh, «46,518 mo».** El saldo inicial (4.091.800 mh) está fijado por P1b, así que los 13 movimientos del libro tienen que sumar exactamente **+560.000 mh**. No es una cifra despejada: es una comprobación de verdad.

**Reglas de la especificación que implementa:**

- **La bolsa inicial de P1b (§3).** «Bolsa inicial del personaje, que admite varias filas de monedas que se suman (38 mo + 25 mp + 40 mb + 18 mc = 40,918 mo).» En mh: 3.800.000 + 250.000 + 40.000 + 1.800 = **4.091.800**. Y «es **opcional**: queda vacío en los importes calculados o agrupados … y en la bolsa inicial de varias filas», así que `saldoInicial` no lleva `introducido`.
- **El saldo (§7).** «**Saldo** de una bolsa o caja = saldo inicial + suma de sus movimientos no programados.» Con la suma de +560.000 mh: 4.091.800 + 560.000 = **4.651.800 mh**, que `formatearOro` escribe «46,518 mo» (la prueba de la fase 1 ya lo comprueba, `formato.test.ts`).
- **Historial corto y saneado (decisión 2).** «Arranca con los movimientos de abril y el final de marzo; todas las reglas recurrentes tienen su `primera`/`inicio` posterior al 31 de marzo de 1640.» Aquí eso se concreta así: **ningún movimiento es anterior al 15 de marzo de 1640** (el primer pago al Gremio, que §6.2 fecha literalmente) y **todas las reglas empiezan el 1 de abril de 1640**.
- **Los dos pagos al Gremio (§6.2).** «El Gremio recibió dos pagos de 10 mo solo a capital, el 15 y el 25 de marzo. Así, el 1 de abril el capital era 40 mo y el interés de 2 mo quedó pendiente.» Por eso los dos pagos van con `aplicarA: 'soloCapital'` y la deuda guarda un `devengo` de 200.000 mh el 1 de abril.
- **Ids legibles y permanentes (decisión 8).** Los registros del ejemplo llevan ids del estilo `dom.tharan`, `mov.tharan.athelas` o `deuda.gremio-tharan`. `EsquemaId` los admite: letras, cifras, punto, guion y guion bajo.
- **Deudas sin campo `concepto` (decisión 12).** «Arreglo de la espada» va en `notas`.
- **El motivo del archivado (decisión 13).** El pergamino «Paso sin rastro» se consumió el 28 de marzo, así que su objeto del inventario queda con `archivado: 'consumido'` y fuera del patrimonio: J3 sigue enseñando **6 objetos** y **81,6 mo**.
- **El dominio es puro (plan de la fase 1).** Ninguno de los dos archivos importa Dexie, React ni APIs del navegador. La prueba de pureza de la tarea 1 recorre los dos módulos nuevos.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/ejemplo/ids.ts`, `src/dominio/ejemplo/partidaYPersonaje.ts`
- Prueba: `src/dominio/ejemplo/partidaYPersonaje.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba comprueba, en este orden: la cabecera de la partida y sus tres dominios; la bolsa inicial y el saldo de Tharan; que los 13 movimientos pasan `EsquemaMovimiento` y que lo tecleado cuadra con lo guardado; las dos reglas del historial corto de la decisión 2; y que las categorías, ubicaciones y personas que usan los registros existen de verdad, con el inventario y las deudas cuadrando con J3, J4, J6 y J7.

Crea `src/dominio/ejemplo/partidaYPersonaje.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { compararFechas, type Fecha } from '../calendario/fecha'
import { OPCIONES_INICIALES } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { aBase } from '../dinero/importe'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { saldoDeCaja } from '../dinero/saldo'
import { EsquemaDeuda } from '../modelo/deudas'
import { EsquemaCaja, EsquemaDominio } from '../modelo/dominios'
import { EsquemaMovimiento, EsquemaRecurrenteDinero } from '../modelo/movimientos'
import { EsquemaPartida, hayAvances } from '../modelo/partida'
import {
  EsquemaHechizo,
  EsquemaIntentoAprendizaje,
  EsquemaInversion,
  EsquemaObjetoInventario,
  EsquemaPergamino,
} from '../modelo/personaje'
import {
  CAJA_THARAN,
  DEUDAS_THARAN,
  DOMINIOS,
  HECHIZOS,
  INTENTOS,
  INVERSIONES,
  MOVIMIENTOS_THARAN,
  OBJETOS,
  PARTIDA,
  PERGAMINOS,
  PERSONAS,
  RECURRENTES_THARAN,
  UBICACIONES,
} from './partidaYPersonaje'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El 15 de marzo de 1640: el día del movimiento más antiguo de la partida (decisión 2). */
const ARRANQUE_DEL_HISTORIAL: Fecha = { anio: 1640, mes: 3, dia: 15 }

/** El 31 de marzo de 1640: ninguna regla recurrente puede empezar ese día ni antes (decisión 2). */
const FIN_DE_MARZO: Fecha = { anio: 1640, mes: 3, dia: 31 }

/** La primera fecha de una recurrencia, que unos tipos llaman `primera` y otros `inicio` (§8). */
function primeraFecha(recurrencia: { primera?: Fecha; inicio?: Fecha; fecha?: Fecha }): Fecha | undefined {
  return recurrencia.primera ?? recurrencia.inicio ?? recurrencia.fecha
}

describe('la partida y sus dominios', () => {
  it('va del 1 de enero al 12 de abril de 1640, con las equivalencias por defecto (§4, §12)', () => {
    expect(EsquemaPartida.safeParse(PARTIDA).success).toBe(true)
    expect(PARTIDA.fechaInicial).toEqual({ anio: 1640, mes: 1, dia: 1 })
    expect(PARTIDA.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    expect(PARTIDA.edad).toBe('tercera')
    expect(PARTIDA.equivalencias).toEqual(EQ)
    expect(PARTIDA.versionFormato).toBe(1)
  })

  it('ya tuvo avances y su ración es fija: 1 saco de 30 kg al mes (§6.1, §7)', () => {
    expect(hayAvances(PARTIDA)).toBe(true)
    expect(PARTIDA.kgPorSaco).toBe(30)
    expect(PARTIDA.diasPorSaco).toBe(30)
    expect(PARTIDA.cambiosDesdeUltimoAvance).toBe(0)
  })

  it('tiene un solo personaje y dos asentamientos, en el orden del menú (§5)', () => {
    expect(DOMINIOS.map((d) => d.nombre)).toEqual(['Tharan', 'Bree', 'Archet'])
    expect(DOMINIOS.filter((d) => d.tipo === 'personaje')).toHaveLength(1)
    for (const dominio of DOMINIOS) {
      expect(EsquemaDominio.safeParse(dominio).success).toBe(true)
    }
  })
})

describe('la bolsa de Tharan', () => {
  it('parte de la bolsa inicial de P1b: 4.091.800 mh, sin «introducido» (§3, P1b)', () => {
    expect(EsquemaCaja.safeParse(CAJA_THARAN).success).toBe(true)
    expect(CAJA_THARAN.saldoInicial.base).toBe(4091800)
    expect(CAJA_THARAN.saldoInicial.introducido).toBeUndefined()
    expect(formatearOro(CAJA_THARAN.saldoInicial.base, EQ)).toBe('40,918 mo')
  })

  it('con sus 13 movimientos da 4.651.800 mh, que se escribe «46,518 mo» (§7, J2)', () => {
    expect(MOVIMIENTOS_THARAN).toHaveLength(13)
    expect(MOVIMIENTOS_THARAN.reduce((total, m) => total + m.importe.base, 0)).toBe(560000)
    const bolsa = saldoDeCaja(CAJA_THARAN, MOVIMIENTOS_THARAN)
    expect(bolsa).toBe(4651800)
    expect(formatearOro(bolsa, EQ)).toBe('46,518 mo')
  })

  it('todos sus movimientos pasan el esquema y ninguno está programado (§8)', () => {
    for (const movimiento of MOVIMIENTOS_THARAN) {
      expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
      expect(movimiento.programado).toBe(false)
      expect(movimiento.dominioId).toBe('dom.tharan')
    }
  })

  it('lo tecleado cuadra con el importe guardado en las equivalencias de la partida (§3)', () => {
    for (const movimiento of MOVIMIENTOS_THARAN) {
      const introducido = movimiento.importe.introducido
      if (introducido !== undefined) {
        expect(aBase(introducido.cantidad, introducido.moneda, PARTIDA.equivalencias)).toBe(
          Math.abs(movimiento.importe.base),
        )
      }
    }
  })
})

describe('el historial corto de la decisión 2', () => {
  it('no hay ningún movimiento anterior al 15 de marzo de 1640', () => {
    for (const movimiento of MOVIMIENTOS_THARAN) {
      expect(compararFechas(movimiento.fecha, ARRANQUE_DEL_HISTORIAL)).toBeGreaterThanOrEqual(0)
    }
    expect(MOVIMIENTOS_THARAN[0].fecha).toEqual(ARRANQUE_DEL_HISTORIAL)
  })

  it('ninguna regla recurrente empieza el 31 de marzo de 1640 ni antes', () => {
    const recurrencias = [
      ...RECURRENTES_THARAN.map((r) => r.recurrencia),
      ...INVERSIONES.map((i) => i.recurrencia),
      ...DEUDAS_THARAN.flatMap((d) => (d.recurrenciaInteres === undefined ? [] : [d.recurrenciaInteres])),
    ]
    expect(recurrencias).toHaveLength(7)
    for (const recurrencia of recurrencias) {
      const primera = primeraFecha(recurrencia)
      expect(primera).toBeDefined()
      expect(compararFechas(primera as Fecha, FIN_DE_MARZO)).toBeGreaterThan(0)
    }
  })
})

describe('lo que el personaje referencia', () => {
  it('sus categorías son del catálogo de fábrica y sus ubicaciones y personas existen (§6.5)', () => {
    const categorias = new Set(OPCIONES_INICIALES.filter((o) => o.lista === 'categorias').map((o) => o.id))
    for (const movimiento of MOVIMIENTOS_THARAN) {
      expect(categorias.has(movimiento.categoriaId)).toBe(true)
    }
    for (const recurrente of RECURRENTES_THARAN) {
      expect(EsquemaRecurrenteDinero.safeParse(recurrente).success).toBe(true)
      expect(categorias.has(recurrente.categoriaId)).toBe(true)
    }
    const ubicaciones = new Set(UBICACIONES.map((u) => u.id))
    for (const objeto of OBJETOS) {
      if (objeto.ubicacion.tipo === 'propia') {
        expect(ubicaciones.has(objeto.ubicacion.ubicacionId)).toBe(true)
      }
    }
    const personas = new Set(PERSONAS.map((p) => p.id))
    for (const deuda of DEUDAS_THARAN) {
      expect(personas.has(deuda.contraparteId)).toBe(true)
    }
  })

  it('el inventario suma 81,6 mo en 6 objetos y el pergamino consumido queda archivado (§6.2, decisión 13)', () => {
    for (const objeto of OBJETOS) {
      expect(EsquemaObjetoInventario.safeParse(objeto).success).toBe(true)
    }
    const enElPatrimonio = OBJETOS.filter((o) => o.archivado === undefined)
    expect(enElPatrimonio).toHaveLength(6)
    const total = enElPatrimonio.reduce((suma, o) => suma + o.cantidad * o.valorUnitario.base, 0)
    expect(total).toBe(8160000)
    expect(formatearOro(total, EQ)).toBe('81,6 mo')
    expect(OBJETOS.filter((o) => o.archivado === 'consumido')).toHaveLength(1)
  })

  it('las deudas, las inversiones y los hechizos cuadran con lo que muestran J4, J6 y J7', () => {
    for (const deuda of DEUDAS_THARAN) {
      expect(EsquemaDeuda.safeParse(deuda).success).toBe(true)
    }
    const gremio = DEUDAS_THARAN[0]
    expect(gremio.pagos.reduce((suma, p) => suma + p.importe.base, 0)).toBe(2000000)
    expect(gremio.devengos.reduce((suma, d) => suma + d.importe.base, 0)).toBe(200000)
    expect(gremio.principal.base - 2000000 + 200000).toBe(4200000)
    for (const inversion of INVERSIONES) {
      expect(EsquemaInversion.safeParse(inversion).success).toBe(true)
    }
    expect(INVERSIONES.reduce((suma, i) => suma + i.capital.base, 0)).toBe(7000000)
    for (const hechizo of HECHIZOS) {
      expect(EsquemaHechizo.safeParse(hechizo).success).toBe(true)
    }
    expect(HECHIZOS.filter((h) => h.estado === 'enEstudio')).toHaveLength(2)
    for (const intento of INTENTOS) {
      expect(EsquemaIntentoAprendizaje.safeParse(intento).success).toBe(true)
    }
    for (const pergamino of PERGAMINOS) {
      expect(EsquemaPergamino.safeParse(pergamino).success).toBe(true)
    }
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/ejemplo/partidaYPersonaje.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./partidaYPersonaje`, que todavía no existe. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/ejemplo/partidaYPersonaje.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/ejemplo/partidaYPersonaje.test.ts [ src/dominio/ejemplo/partidaYPersonaje.test.ts ]
Error: Cannot find module './partidaYPersonaje' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/ejemplo/partidaYPersonaje.test.ts
 ❯ src/dominio/ejemplo/partidaYPersonaje.test.ts:19:1
     17|   EsquemaPergamino,
     18| } from '../modelo/personaje'
     19| import {
       | ^
     20|   CAJA_THARAN,
     21|   DEUDAS_THARAN,


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Escribir los ids legibles del ejemplo**

Este archivo es solo una tabla de constantes: ningún id se teclea dos veces en el resto del ejemplo, así que una errata no puede colarse en una referencia. Lo usan también las tareas 19 y 20, así que aquí ya están todos los ids de los asentamientos.

Crea `src/dominio/ejemplo/ids.ts` con este contenido:

```ts
import type { Id } from '../modelo/comunes'

/** Id de la partida de ejemplo (decisión 8: ids legibles y permanentes). */
export const PARTIDA_ID: Id = 'p.sombra-del-este'

/** Los tres dominios: el personaje y los dos asentamientos (§8). */
export const DOM = {
  tharan: 'dom.tharan',
  bree: 'dom.bree',
  archet: 'dom.archet',
} as const

/** Las seis personas y entidades de la partida (§6.5 n.º 15). */
export const PERSONA = {
  gremioBree: 'persona.gremio-de-mercaderes-de-bree',
  hobart: 'persona.hobart-brezal',
  dalen: 'persona.dalen-de-esgaroth',
  joyeroBree: 'persona.joyero-de-bree',
  corona: 'persona.corona-de-arthedain',
  barnabas: 'persona.barnabas-mantecona',
} as const

/** Las dos ubicaciones propias de la partida (§6.5 n.º 14). */
export const UBICACION = {
  posada: 'ubi.posada-el-poney-pisador',
  establoDeBree: 'ubi.establo-de-bree',
} as const

/** Los cuatro avances del ejemplo, nombrados por su fecha de fin (decisión 5). */
export const AVANCE = {
  hasta31Marzo: 'av.hasta-31-marzo',
  hasta6Abril: 'av.hasta-6-abril',
  hasta10Abril: 'av.hasta-10-abril',
  hasta12Abril: 'av.hasta-12-abril',
} as const

/** Los movimientos del libro de Tharan (§6.2, J2). */
export const MOV_THARAN = {
  pagoGremio1: 'mov.tharan.pago-gremio-1',
  compraPergamino: 'mov.tharan.compra-pergamino',
  pagoGremio2: 'mov.tharan.pago-gremio-2',
  beneficioTonel: 'mov.tharan.beneficio-tonel-1-abril',
  posada6Abril: 'mov.tharan.posada-6-abril',
  establo6Abril: 'mov.tharan.establo-6-abril',
  transferencia: 'mov.tharan.transferencia-desde-bree',
  posada10Abril: 'mov.tharan.posada-10-abril',
  establo10Abril: 'mov.tharan.establo-10-abril',
  recompensa: 'mov.tharan.recompensa',
  athelas: 'mov.tharan.athelas',
  posada12Abril: 'mov.tharan.posada-12-abril',
  establo12Abril: 'mov.tharan.establo-12-abril',
} as const

/** Los movimientos de la tesorería de Bree (§6.3, A2). */
export const MOV_BREE = {
  adelantoGranero: 'mov.bree.adelanto-granero',
  impuestoHogar: 'mov.bree.impuesto-por-hogar-1-abril',
  locales: 'mov.bree.locales-1-abril',
  aranceles1Abril: 'mov.bree.aranceles-1-abril',
  caravanaTharbad: 'mov.bree.caravana-tharbad',
  peaje6Abril: 'mov.bree.peaje-6-abril',
  salarios6Abril: 'mov.bree.salarios-6-abril',
  transferencia: 'mov.bree.transferencia-a-tharan',
  obraPuerta: 'mov.bree.obra-puerta',
  aranceles8Abril: 'mov.bree.aranceles-8-abril',
  soldadas10Abril: 'mov.bree.soldadas-10-abril',
  alquilerMolino: 'mov.bree.alquiler-molino-10-abril',
  obraGranero: 'mov.bree.obra-granero',
  peaje10Abril: 'mov.bree.peaje-10-abril',
  peaje12Abril: 'mov.bree.peaje-12-abril',
} as const

/** El único movimiento de la caja de Archet (§6.3). */
export const MOV_ARCHET = {
  obraMolino: 'mov.archet.obra-molino',
} as const

/** La transferencia de Bree a Tharan del 6 de abril (§6.2). */
export const TRANSFERENCIA = {
  breeATharan: 'tr.bree-tharan-6-abril',
} as const

/** Las cuatro deudas de la partida y los dos pagos anotados (§6.2 J4, §6.3 A2b). */
export const DEUDA = {
  gremioTharan: 'deuda.gremio-tharan',
  hobart: 'deuda.hobart',
  dalen: 'deuda.dalen',
  gremioBree: 'deuda.gremio-bree',
} as const

/** Los dos pagos anotados en la deuda del Gremio (§6.2, J4b). */
export const PAGO = {
  gremio1: 'pago.gremio-15-marzo',
  gremio2: 'pago.gremio-25-marzo',
} as const

/** Los gastos e ingresos recurrentes de Tharan (§6.2, J5). */
export const RECURRENTE = {
  posada: 'rec.posada-el-poney-pisador',
  establo: 'rec.establo-del-poni',
  escolta: 'rec.escolta-de-dos-guardias',
  alquilerCasaArchet: 'rec.alquiler-de-la-casa-de-archet',
} as const

/** Los siete objetos del inventario de Tharan, uno de ellos archivado (§6.2, J3). */
export const OBJETO = {
  espada: 'obj.espada-larga-dunadan',
  cota: 'obj.cota-de-malla',
  esmeraldas: 'obj.esmeralda-tallada',
  athelas: 'obj.athelas',
  pergaminoLuz: 'obj.pergamino-luz-de-elbereth',
  poni: 'obj.poni-castano',
  pergaminoPaso: 'obj.pergamino-paso-sin-rastro',
} as const

/** Las dos inversiones activas de Tharan (§6.2, J6). */
export const INVERSION = {
  tonelDorado: 'inv.el-tonel-dorado',
  barcaza: 'inv.barcaza-del-brandivino',
} as const

/** Los tres hechizos de Tharan (§6.2, J7). */
export const HECHIZO = {
  pasoSinRastro: 'hech.paso-sin-rastro',
  luzDeElbereth: 'hech.luz-de-elbereth',
  hablarConLosAnimales: 'hech.hablar-con-los-animales',
} as const

/** Los cinco intentos de aprendizaje (§6.2, J7). */
export const INTENTO = {
  hablar20Enero: 'int.hablar-20-enero',
  hablar3Febrero: 'int.hablar-3-febrero',
  luz25Marzo: 'int.luz-25-marzo',
  paso28Marzo: 'int.paso-28-marzo',
  paso10Abril: 'int.paso-10-abril',
} as const

/** Los dos pergaminos (§6.2, J7). */
export const PERGAMINO = {
  luzDeElbereth: 'perg.luz-de-elbereth',
  pasoSinRastro: 'perg.paso-sin-rastro',
} as const

/** Los cambios de población y los consumos por habitante de Bree (§6.3, A4). */
export const CAMBIO_POBLACION = {
  fiebres: 'camb.bree.fiebres-de-invierno',
  hobbits: 'camb.bree.hobbits-de-la-comarca',
  cardolan: 'camb.bree.familias-de-cardolan',
} as const

/** Los dos consumos por habitante de Bree (§6.3, A4). */
export const CONSUMO = {
  cerveza: 'cons.bree.cerveza',
  lena: 'cons.bree.lena',
} as const

/** El único ajuste de existencias del ejemplo (§6.3, A8). */
export const AJUSTE_EXISTENCIAS = {
  maderaPodrida: 'aj.bree.madera-2-abril',
} as const

/** Los seis edificios de Bree (§6.3, A7). */
export const EDIFICIO = {
  granjas: 'ed.granjas-del-oeste',
  aserradero: 'ed.aserradero',
  cerveceria: 'ed.cerveceria',
  cantera: 'ed.cantera',
  redil: 'ed.redil',
  molino: 'ed.molino',
} as const

/** Las seis producciones de esos edificios (§6.3, A7b). */
export const PRODUCCION = {
  granjasViveres: 'prod.granjas-viveres',
  aserraderoMadera: 'prod.aserradero-madera',
  cerveceriaCerveza: 'prod.cerveceria-cerveza',
  canteraPiedra: 'prod.cantera-piedra',
  canteraArcilla: 'prod.cantera-arcilla',
  redilLana: 'prod.redil-lana',
} as const

/** Las seis producciones ya ocurridas que dejó el motor (decisión 1). */
export const PRODUCCION_REALIZADA = {
  arcilla1Abril: 'pr.arcilla-1-abril',
  viveres7Abril: 'pr.viveres-7-abril',
  madera7Abril: 'pr.madera-7-abril',
  cerveza7Abril: 'pr.cerveza-7-abril',
  piedra7Abril: 'pr.piedra-7-abril',
  lana7Abril: 'pr.lana-7-abril',
} as const

/** Las filas de trabajadores de Bree y de Archet (§6.3, A5). */
export const TRABAJADOR = {
  granjeros: 'trab.bree.granjeros',
  lenadores: 'trab.bree.lenadores',
  cerveceros: 'trab.bree.cerveceros',
  canteros: 'trab.bree.canteros',
  pastores: 'trab.bree.pastores',
  albanilesArchet: 'trab.archet.albaniles',
} as const

/** Las obras de los dos asentamientos (§6.3, A9). */
export const OBRA = {
  puerta: 'obra.reparacion-de-la-puerta-del-sur',
  granero: 'obra.nuevo-granero',
  cerveceria: 'obra.ampliar-la-cerveceria',
  molinoArchet: 'obra.molino-de-archet',
} as const

/** Los impuestos, rentas y tributos de los dos asentamientos (§6.3, A3). */
export const IMPUESTO = {
  hogar: 'imp.bree.impuesto-por-hogar',
  aranceles: 'imp.bree.aranceles-del-mercado',
  alquilerMolino: 'imp.bree.alquiler-del-molino',
  peaje: 'imp.bree.peaje-del-camino',
  diezmo: 'imp.bree.diezmo-a-fornost',
  tributoArchet: 'imp.archet.tributo-a-la-corona',
  rentasArchet: 'imp.archet.rentas-de-las-tierras',
} as const

/** Los tres tipos de local de Bree (§6.3, A3b). */
export const TIPO_LOCAL = {
  herreria: 'tipoloc.bree.herreria',
  posada: 'tipoloc.bree.posada',
  tienda: 'tipoloc.bree.tienda',
} as const

/** Los cuatro locales comerciales de Bree (§6.3, A3b). */
export const LOCAL = {
  herreria1: 'loc.bree.herreria-1',
  posada: 'loc.bree.posada-el-poney-pisador',
  tiendaDeTelas: 'loc.bree.tienda-de-telas',
  ultramarinos: 'loc.bree.ultramarinos-del-camino',
} as const

/** Los cuatro mercados de la partida (§6.3, A10). */
export const MERCADO = {
  bree: 'mer.bree',
  archet: 'mer.archet',
  fornost: 'mer.fornost',
  tharbad: 'mer.tharbad',
} as const

/** Las dos caravanas en ruta (§6.3, A10). */
export const CARAVANA = {
  ventaCervezaFornost: 'car.venta-de-cerveza-en-fornost',
  compraViveresTharbad: 'car.compra-de-viveres-en-tharbad',
} as const

/** Las tres unidades de la guarnición de Bree (§6.3, A6). */
export const UNIDAD = {
  guardias: 'uni.guardias-de-la-puerta',
  arqueros: 'uni.arqueros-de-la-empalizada',
  capitan: 'uni.capitan-de-la-guardia',
} as const

/** Las tres defensas de Bree (§6.3, A6). */
export const DEFENSA = {
  empalizada: 'def.empalizada-norte',
  puerta: 'def.puerta-del-sur',
  torre: 'def.torre-de-vigia',
} as const

/** Las once filas de animales de Bree (§6.3, A12). */
export const ANIMAL = {
  vacas: 'ani.bree.vacas',
  toro: 'ani.bree.toro',
  bueyes: 'ani.bree.bueyes',
  caballosDeTiro: 'ani.bree.caballos-de-tiro',
  ponis: 'ani.bree.ponis',
  ovejas: 'ani.bree.ovejas',
  carneros: 'ani.bree.carneros',
  cerdos: 'ani.bree.cerdos',
  gallinas: 'ani.bree.gallinas',
  gallos: 'ani.bree.gallos',
  perrosPastores: 'ani.bree.perros-pastores',
} as const

/** Las nueve filas de la armería de Bree (§6.3, A6b). */
export const ARMERIA = {
  lanzas: 'arm.bree.lanzas',
  arcos: 'arm.bree.arcos-largos',
  flechas: 'arm.bree.flechas',
  espadas: 'arm.bree.espadas-cortas',
  escudos: 'arm.bree.escudos-redondos',
  cotas: 'arm.bree.cotas-de-malla',
  yelmos: 'arm.bree.yelmos-de-hierro',
  jubones: 'arm.bree.jubones-de-cuero',
  ballestas: 'arm.bree.ballestas',
} as const

/** Los cuatro eventos narrativos de Bree (§6.3, A11). */
export const EVENTO = {
  lluvias: 'ev.lluvias-de-primavera',
  feria: 'ev.feria-de-primavera',
  bandidos: 'ev.incursion-de-bandidos',
  mensajero: 'ev.visita-del-mensajero-real',
} as const
```

- [ ] **Paso 4: Escribir la partida y el personaje**

Crea `src/dominio/ejemplo/partidaYPersonaje.ts` con este contenido:

```ts
import { CATEGORIA, idDeOpcion } from '../catalogo/inicial'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import type { Ubicacion, PersonaEntidad } from '../modelo/catalogos'
import type { Deuda } from '../modelo/deudas'
import type { Caja, Dominio } from '../modelo/dominios'
import type { Movimiento, RecurrenteDinero } from '../modelo/movimientos'
import { VERSION_FORMATO, type Partida } from '../modelo/partida'
import type { Hechizo, IntentoAprendizaje, Inversion, ObjetoInventario, Pergamino, Venta } from '../modelo/personaje'
import {
  AVANCE,
  DEUDA,
  DOM,
  HECHIZO,
  INTENTO,
  INVERSION,
  MOV_THARAN,
  OBJETO,
  PAGO,
  PARTIDA_ID,
  PERGAMINO,
  PERSONA,
  RECURRENTE,
  TRANSFERENCIA,
  UBICACION,
} from './ids'

/**
 * Las cinco categorías de fábrica que usa el ejemplo y que no están en `CATEGORIA`, que solo lleva las 16
 * protegidas (§6.5 n.º 6). Se piden a `idDeOpcion` para no copiar el id a mano (decisión 8).
 */
const CAT_ALOJAMIENTO = idDeOpcion('categorias', 'Alojamiento')
const CAT_MONTURA = idDeOpcion('categorias', 'Montura')
const CAT_RECOMPENSAS = idDeOpcion('categorias', 'Recompensas')
const CAT_HIERBAS = idDeOpcion('categorias', 'Hierbas y curación')
const CAT_VIAJES = idDeOpcion('categorias', 'Viajes y peajes')

/** El 1 de enero de 1640 T.E., domingo: la fecha inicial de la partida (§4, P1). */
export const FECHA_INICIAL = { anio: 1640, mes: 1, dia: 1 }

/** El 12 de abril de 1640 T.E., jueves: la fecha actual, antes del avance del 12 al 19 (§12). */
export const FECHA_ACTUAL = { anio: 1640, mes: 4, dia: 12 }

/**
 * «La Sombra del Este» tal como está guardada el 12 de abril de 1640 (§8). Las equivalencias son las de
 * por defecto (1 mo = 100.000 mh) y la ración es fija: 1 saco de 30 kg por persona y mes (§6.1).
 */
export const PARTIDA: Partida = {
  id: PARTIDA_ID,
  nombre: 'La Sombra del Este',
  edad: 'tercera',
  equivalencias: EQUIVALENCIAS_POR_DEFECTO,
  kgPorSaco: 30,
  diasPorSaco: 30,
  fechaInicial: FECHA_INICIAL,
  fechaActual: FECHA_ACTUAL,
  creada: '2026-06-15T17:20:00.000Z',
  actualizada: '2026-09-08T19:45:00.000Z',
  versionFormato: VERSION_FORMATO,
  cambiosDesdeUltimoAvance: 0,
}

/** El personaje y los dos asentamientos, en el orden del menú: Tharan, Bree y Archet (§5). */
export const DOMINIOS: Dominio[] = [
  { id: DOM.tharan, tipo: 'personaje', nombre: 'Tharan', descripcion: 'Montaraz dúnadan' },
  { id: DOM.bree, tipo: 'asentamiento', nombre: 'Bree', categoria: 'pueblo', alta: FECHA_INICIAL },
  { id: DOM.archet, tipo: 'asentamiento', nombre: 'Archet', categoria: 'aldea', alta: FECHA_INICIAL },
]

/**
 * La bolsa de Tharan: 38 mo + 25 mp + 40 mb + 18 mc = 4.091.800 mh = 40,918 mo (§3, P1b).
 * La bolsa de varias filas no guarda «introducido»: solo se guarda el total en oro (§3).
 */
export const CAJA_THARAN: Caja = {
  dominioId: DOM.tharan,
  saldoInicial: { base: 4091800 },
}

/** Las dos ubicaciones propias de la partida; «Encima», las cajas y los almacenes no se guardan (§8). */
export const UBICACIONES: Ubicacion[] = [
  { id: UBICACION.posada, nombre: 'Posada El Poney Pisador' },
  { id: UBICACION.establoDeBree, nombre: 'Establo de Bree' },
]

/** Las seis personas y entidades: contrapartes, titulares, destinatarios y compradores (§8). */
export const PERSONAS: PersonaEntidad[] = [
  { id: PERSONA.gremioBree, nombre: 'Gremio de mercaderes de Bree' },
  { id: PERSONA.hobart, nombre: 'Hobart Brezal, herrero' },
  { id: PERSONA.dalen, nombre: 'Dalen, mercader de Esgaroth' },
  { id: PERSONA.joyeroBree, nombre: 'Joyero de Bree' },
  { id: PERSONA.corona, nombre: 'Corona de Arthedain' },
  { id: PERSONA.barnabas, nombre: 'Barnabás Mantecona, posadero' },
]

/**
 * El libro de la bolsa de Tharan: 13 movimientos, todos aplicados (§6.2, J2). Suman +560.000 mh, así que
 * la bolsa queda en 4.091.800 + 560.000 = 4.651.800 mh = 46,518 mo.
 * El historial arranca el 15 de marzo de 1640 (decisión 2): no hay nada anterior.
 */
export const MOVIMIENTOS_THARAN: Movimiento[] = [
  {
    id: MOV_THARAN.pagoGremio1,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 3, dia: 15 },
    tipo: 'gasto',
    importe: { base: -1000000, introducido: { cantidad: '10', moneda: 'mo' } },
    categoriaId: CATEGORIA.prestamosYDeudas,
    concepto: 'Pago al Gremio de mercaderes de Bree',
    origen: 'manual',
    vinculo: { tipo: 'pagoDeuda', id: PAGO.gremio1 },
    programado: false,
  },
  {
    id: MOV_THARAN.compraPergamino,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 3, dia: 20 },
    tipo: 'gasto',
    importe: { base: -736000, introducido: { cantidad: '7,36', moneda: 'mo' } },
    categoriaId: CATEGORIA.pergaminosYEstudio,
    concepto: 'Compra del pergamino «Paso sin rastro»',
    origen: 'manual',
    programado: false,
  },
  {
    id: MOV_THARAN.pagoGremio2,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 3, dia: 25 },
    tipo: 'gasto',
    importe: { base: -1000000, introducido: { cantidad: '10', moneda: 'mo' } },
    categoriaId: CATEGORIA.prestamosYDeudas,
    concepto: 'Pago al Gremio de mercaderes de Bree',
    origen: 'manual',
    vinculo: { tipo: 'pagoDeuda', id: PAGO.gremio2 },
    programado: false,
  },
  {
    id: MOV_THARAN.beneficioTonel,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 1 },
    tipo: 'ingreso',
    importe: { base: 300000 },
    categoriaId: CATEGORIA.beneficiosDeInversiones,
    concepto: 'Beneficio de El Tonel Dorado',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'beneficio', id: INVERSION.tonelDorado },
    inversionId: INVERSION.tonelDorado,
    programado: false,
  },
  {
    id: MOV_THARAN.posada6Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'gasto',
    importe: { base: -60000 },
    categoriaId: CAT_ALOJAMIENTO,
    concepto: 'Posada El Poney Pisador · 6 noches',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
  {
    id: MOV_THARAN.establo6Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'gasto',
    importe: { base: -12000 },
    categoriaId: CAT_MONTURA,
    concepto: 'Establo del poni · 6 días',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
  {
    id: MOV_THARAN.transferencia,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'transferencia',
    importe: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
    categoriaId: CATEGORIA.transferencias,
    concepto: 'Transferencia desde Bree',
    origen: 'manual',
    vinculo: { tipo: 'transferencia', id: TRANSFERENCIA.breeATharan },
    programado: false,
  },
  {
    id: MOV_THARAN.posada10Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -40000 },
    categoriaId: CAT_ALOJAMIENTO,
    concepto: 'Posada El Poney Pisador · 4 noches',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
  {
    id: MOV_THARAN.establo10Abril,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -8000 },
    categoriaId: CAT_MONTURA,
    concepto: 'Establo del poni · 4 días',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
  {
    id: MOV_THARAN.recompensa,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'ingreso',
    importe: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
    categoriaId: CAT_RECOMPENSAS,
    concepto: 'Recompensa de la guardia de Bree',
    origen: 'manual',
    programado: false,
  },
  {
    id: MOV_THARAN.athelas,
    dominioId: DOM.tharan,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -60000, introducido: { cantidad: '6', moneda: 'mp' } },
    categoriaId: CAT_HIERBAS,
    concepto: 'Compra de athelas (3)',
    origen: 'manual',
    programado: false,
  },
  {
    id: MOV_THARAN.posada12Abril,
    dominioId: DOM.tharan,
    fecha: FECHA_ACTUAL,
    tipo: 'gasto',
    importe: { base: -20000 },
    categoriaId: CAT_ALOJAMIENTO,
    concepto: 'Posada El Poney Pisador · 2 noches',
    origen: 'avance',
    avanceId: AVANCE.hasta12Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.posada },
    programado: false,
  },
  {
    id: MOV_THARAN.establo12Abril,
    dominioId: DOM.tharan,
    fecha: FECHA_ACTUAL,
    tipo: 'gasto',
    importe: { base: -4000 },
    categoriaId: CAT_MONTURA,
    concepto: 'Establo del poni · 2 días',
    origen: 'avance',
    avanceId: AVANCE.hasta12Abril,
    regla: { tipo: 'recurrente', id: RECURRENTE.establo },
    programado: false,
  },
]

/** Las dos deudas y el préstamo de Tharan (§6.2, J4). El concepto vive en `notas` (decisión 12). */
export const DEUDAS_THARAN: Deuda[] = [
  {
    id: DEUDA.gremioTharan,
    dominioId: DOM.tharan,
    sentido: 'debo',
    contraparteId: PERSONA.gremioBree,
    fecha: { anio: 1640, mes: 3, dia: 2 },
    principal: { base: 6000000, introducido: { cantidad: '60', moneda: 'mo' } },
    interesPct: 5,
    recurrenciaInteres: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
    vencimiento: { anio: 1640, mes: 5, dia: 1 },
    estado: 'abierta',
    impago: false,
    pagos: [
      {
        id: PAGO.gremio1,
        fecha: { anio: 1640, mes: 3, dia: 15 },
        importe: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
        aplicarA: 'soloCapital',
        movimientoId: MOV_THARAN.pagoGremio1,
      },
      {
        id: PAGO.gremio2,
        fecha: { anio: 1640, mes: 3, dia: 25 },
        importe: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
        aplicarA: 'soloCapital',
        movimientoId: MOV_THARAN.pagoGremio2,
      },
    ],
    devengos: [
      { fecha: { anio: 1640, mes: 4, dia: 1 }, importe: { base: 200000 }, avanceId: AVANCE.hasta6Abril },
    ],
  },
  {
    id: DEUDA.hobart,
    dominioId: DOM.tharan,
    sentido: 'debo',
    contraparteId: PERSONA.hobart,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    principal: { base: 400000, introducido: { cantidad: '4', moneda: 'mo' } },
    interesPct: 0,
    vencimiento: { anio: 1640, mes: 4, dia: 20 },
    notas: 'Arreglo de la espada',
    estado: 'abierta',
    impago: false,
    pagos: [],
    devengos: [],
  },
  {
    id: DEUDA.dalen,
    dominioId: DOM.tharan,
    sentido: 'meDeben',
    contraparteId: PERSONA.dalen,
    fecha: { anio: 1640, mes: 3, dia: 5 },
    principal: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
    interesPct: 0,
    vencimiento: { anio: 1640, mes: 6, dia: 5 },
    estado: 'abierta',
    impago: false,
    pagos: [],
    devengos: [],
  },
]

/**
 * Los cuatro gastos e ingresos recurrentes de Tharan (§6.2, J5). Los dos diarios están activos y son los que
 * crea el motor en cada avance; la escolta y el alquiler están en pausa. Todos empiezan el 1 de abril de 1640
 * (decisión 2: ninguna regla es anterior al 31 de marzo).
 */
export const RECURRENTES_THARAN: RecurrenteDinero[] = [
  {
    id: RECURRENTE.posada,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto: 'Posada El Poney Pisador',
    importe: { base: 10000, introducido: { cantidad: '1', moneda: 'mp' } },
    categoriaId: CAT_ALOJAMIENTO,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: true,
    notas: 'habitación individual',
    unidadDiaria: 'noches',
  },
  {
    id: RECURRENTE.establo,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto: 'Establo del poni',
    importe: { base: 2000, introducido: { cantidad: '2', moneda: 'mb' } },
    categoriaId: CAT_MONTURA,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'diaria', inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: true,
    notas: 'paja y cuidados',
  },
  {
    id: RECURRENTE.escolta,
    dominioId: DOM.tharan,
    tipo: 'gasto',
    concepto: 'Escolta de dos guardias',
    importe: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
    categoriaId: CAT_VIAJES,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'semanal', diaSemana: 6, inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: false,
    notas: 'para viajar por el Camino del Este',
  },
  {
    id: RECURRENTE.alquilerCasaArchet,
    dominioId: DOM.tharan,
    tipo: 'ingreso',
    concepto: 'Alquiler de la casa de Archet',
    importe: { base: 50000, introducido: { cantidad: '0,5', moneda: 'mo' } },
    categoriaId: CATEGORIA.rentasYAlquileres,
    cuentaId: DOM.tharan,
    recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
    activo: false,
    notas: 'sin inquilino desde marzo',
  },
]

/**
 * El inventario de Tharan: 6 objetos en el patrimonio (81,6 mo) y el pergamino consumido, archivado y fuera
 * del patrimonio (§6.2, J3; decisión 13).
 */
export const OBJETOS: ObjetoInventario[] = [
  {
    id: OBJETO.espada,
    dominioId: DOM.tharan,
    nombre: 'Espada larga dúnadan',
    cantidad: 1,
    valorUnitario: { base: 1800000, introducido: { cantidad: '18', moneda: 'mo' } },
    ubicacion: { tipo: 'encima' },
    notas: 'Forjada en Fornost',
  },
  {
    id: OBJETO.cota,
    dominioId: DOM.tharan,
    nombre: 'Cota de malla',
    cantidad: 1,
    valorUnitario: { base: 2500000, introducido: { cantidad: '25', moneda: 'mo' } },
    ubicacion: { tipo: 'encima' },
  },
  {
    id: OBJETO.esmeraldas,
    dominioId: DOM.tharan,
    nombre: 'Esmeralda tallada',
    cantidad: 2,
    valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
    ubicacion: { tipo: 'caja', dominioId: DOM.bree },
  },
  {
    id: OBJETO.athelas,
    dominioId: DOM.tharan,
    nombre: 'Athelas',
    cantidad: 3,
    valorUnitario: { base: 20000, introducido: { cantidad: '2', moneda: 'mp' } },
    ubicacion: { tipo: 'encima' },
    movimientoCompraId: MOV_THARAN.athelas,
  },
  {
    id: OBJETO.pergaminoLuz,
    dominioId: DOM.tharan,
    nombre: 'Pergamino «Luz de Elbereth»',
    cantidad: 1,
    valorUnitario: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
    ubicacion: { tipo: 'propia', ubicacionId: UBICACION.posada },
  },
  {
    id: OBJETO.poni,
    dominioId: DOM.tharan,
    nombre: 'Poni «Castaño»',
    cantidad: 1,
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
    ubicacion: { tipo: 'propia', ubicacionId: UBICACION.establoDeBree },
  },
  {
    id: OBJETO.pergaminoPaso,
    dominioId: DOM.tharan,
    nombre: 'Pergamino «Paso sin rastro»',
    cantidad: 1,
    valorUnitario: { base: 736000, introducido: { cantidad: '7,36', moneda: 'mo' } },
    ubicacion: { tipo: 'encima' },
    movimientoCompraId: MOV_THARAN.compraPergamino,
    archivado: 'consumido',
  },
]

/** Tharan no ha vendido nada: J3 muestra sus 6 objetos y el total es el de los 6 (§6.2). */
export const VENTAS: Venta[] = []

/** Las dos inversiones activas: 70 mo de capital y +4,5 mo al mes (§6.2, J6). */
export const INVERSIONES: Inversion[] = [
  {
    id: INVERSION.tonelDorado,
    dominioId: DOM.tharan,
    negocio: 'El Tonel Dorado',
    descripcion: 'Posada en Archet',
    capital: { base: 5000000, introducido: { cantidad: '50', moneda: 'mo' } },
    participacionPct: 25,
    beneficio: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
    recurrencia: { tipo: 'mensual', diaMes: 1, inicio: { anio: 1640, mes: 4, dia: 1 } },
    cuentaBeneficiosId: DOM.tharan,
    estado: 'activa',
  },
  {
    id: INVERSION.barcaza,
    dominioId: DOM.tharan,
    negocio: 'Barcaza del Brandivino',
    descripcion: 'Transporte de mercancías por el río',
    capital: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
    participacionPct: 10,
    beneficio: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
    recurrencia: { tipo: 'mensual', diaMes: 15, inicio: { anio: 1640, mes: 4, dia: 1 } },
    cuentaBeneficiosId: DOM.tharan,
    estado: 'activa',
  },
]

/** Los tres hechizos: 2 en estudio y 1 aprendido (§6.2, J7). */
export const HECHIZOS: Hechizo[] = [
  {
    id: HECHIZO.pasoSinRastro,
    dominioId: DOM.tharan,
    nombre: 'Paso sin rastro',
    lista: 'Sendas del bosque',
    reino: 'canalizacion',
    nivel: 2,
    estado: 'enEstudio',
  },
  {
    id: HECHIZO.luzDeElbereth,
    dominioId: DOM.tharan,
    nombre: 'Luz de Elbereth',
    lista: 'Caminos de la luz',
    reino: 'esencia',
    nivel: 3,
    estado: 'enEstudio',
  },
  {
    id: HECHIZO.hablarConLosAnimales,
    dominioId: DOM.tharan,
    nombre: 'Hablar con los animales',
    lista: 'Voces de la naturaleza',
    reino: 'canalizacion',
    nivel: 1,
    estado: 'aprendido',
    aprendidoEl: { anio: 1640, mes: 2, dia: 5 },
  },
]

/** Los cinco intentos de aprendizaje, del más antiguo al más reciente (§6.2, J7). */
export const INTENTOS: IntentoAprendizaje[] = [
  {
    id: INTENTO.hablar20Enero,
    hechizoId: HECHIZO.hablarConLosAnimales,
    fecha: { anio: 1640, mes: 1, dia: 20 },
    resultado: 'malo',
    pergaminoConsumido: false,
  },
  {
    id: INTENTO.hablar3Febrero,
    hechizoId: HECHIZO.hablarConLosAnimales,
    fecha: { anio: 1640, mes: 2, dia: 3 },
    resultado: 'bueno',
    pergaminoConsumido: false,
  },
  {
    id: INTENTO.luz25Marzo,
    hechizoId: HECHIZO.luzDeElbereth,
    fecha: { anio: 1640, mes: 3, dia: 25 },
    resultado: 'bueno',
    pergaminoConsumido: false,
  },
  {
    id: INTENTO.paso28Marzo,
    hechizoId: HECHIZO.pasoSinRastro,
    fecha: { anio: 1640, mes: 3, dia: 28 },
    resultado: 'malo',
    pergaminoId: PERGAMINO.pasoSinRastro,
    pergaminoConsumido: true,
  },
  {
    id: INTENTO.paso10Abril,
    hechizoId: HECHIZO.pasoSinRastro,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    resultado: 'malo',
    pergaminoConsumido: false,
  },
]

/** Los dos pergaminos: uno poseído y otro consumido el 28 de marzo (§6.2, J7). */
export const PERGAMINOS: Pergamino[] = [
  {
    id: PERGAMINO.luzDeElbereth,
    dominioId: DOM.tharan,
    hechizoId: HECHIZO.luzDeElbereth,
    nombre: 'Luz de Elbereth',
    nivel: 3,
    estado: 'poseido',
    objetoInventarioId: OBJETO.pergaminoLuz,
  },
  {
    id: PERGAMINO.pasoSinRastro,
    dominioId: DOM.tharan,
    hechizoId: HECHIZO.pasoSinRastro,
    nombre: 'Paso sin rastro',
    nivel: 2,
    estado: 'consumido',
    consumidoEl: { anio: 1640, mes: 3, dia: 28 },
    objetoInventarioId: OBJETO.pergaminoPaso,
    movimientoCompraId: MOV_THARAN.compraPergamino,
  },
]
```

- [ ] **Paso 5: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/ejemplo/partidaYPersonaje.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  11:02:41
   Duration  631ms (transform 49%, import 43%, tests 6%, worker 2%)
```

- [ ] **Paso 6: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es lo que detecta que a un registro del ejemplo le falta un campo obligatorio o que un literal no está en su enumeración; `vitest run` solo ejecuta.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 516 pruebas en 43 archivos. La tarea 17 dejó 502 pruebas en 42 archivos, y esta tarea trae **14 nuevas**: las 12 de `partidaYPersonaje.test.ts` y **dos más** en `pureza.test.ts`, que es un `it.each` sobre los módulos del dominio y ahora recorre también `ejemplo/ids.ts` y `ejemplo/partidaYPersonaje.ts`.

```text
 Test Files  43 passed (43)
      Tests  516 passed (516)
```

- [ ] **Paso 7: Commit**

```bash
git add src/dominio/ejemplo/ids.ts src/dominio/ejemplo/partidaYPersonaje.ts src/dominio/ejemplo/partidaYPersonaje.test.ts
git commit -m "feat(ejemplo): la partida La Sombra del Este y el personaje Tharan" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/ejemplo/ids.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/partidaYPersonaje.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/partidaYPersonaje.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 4c1b7e0] feat(ejemplo): la partida La Sombra del Este y el personaje Tharan
 3 files changed, 1065 insertions(+)
 create mode 100644 src/dominio/ejemplo/ids.ts
 create mode 100644 src/dominio/ejemplo/partidaYPersonaje.test.ts
 create mode 100644 src/dominio/ejemplo/partidaYPersonaje.ts
```

**Avisos que esta tarea deja escritos** (consecuencia de la decisión 2, «historial corto y saneado»):

1. Con el historial recortado, los recuentos de P7 quedan por debajo de lo que dibujan las vistas: Alojamiento tiene 3 movimientos y no 6, y Montura otros 3. La fase 9 alargará el historial.
2. La **Mercería de Staddle** (la inversión retirada el 3 de febrero de J6) **no** entra en el ejemplo: `Inversion` con estado `retirada` exige un `movimientoId`, y ese movimiento sería de febrero, fuera del historial corto. Por eso el ejemplo tiene dos inversiones, las dos activas, y J6 no tendría «Retiradas».
3. «Cobrado hasta hoy 10,5 mo» de J6 tampoco se cumple: con el historial corto, el único cobro de beneficios es el de El Tonel Dorado del 1 de abril (3 mo).

---

### Tarea 19 · Ejemplo: asentamientos, dinero

Esta tarea escribe el dinero de Bree y de Archet: sus dos cajas, los 16 movimientos de sus libros, la transferencia que cruza con la bolsa de Tharan, la deuda del Gremio, las siete reglas de ingresos y tributos, los tres tipos de local con sus cuatro locales comerciales, la plantilla de trabajadores y la guarnición. Todo vive en un archivo nuevo, `src/dominio/ejemplo/asentamientosDinero.ts`, que reutiliza los ids de `ids.ts` (tarea 18).

Depende de la tarea 18: el libro de Bree apunta a `MOV_THARAN.transferencia` y la transferencia apunta a los dos movimientos, uno en cada dominio. Sigue sin haber almacén, edificios ni caravanas: eso llega en la tarea 20, y por eso aquí los `vinculo` de obra y de caravana apuntan a ids que todavía no tienen registro. **No pasa nada**: las validaciones de la tarea 13 no se ejecutan hasta la tarea 20, cuando el documento está completo.

**Las dos cifras que manda son las cajas: Bree 34.060.000 mh («340,6 mo») y Archet 8.500.000 mh («85 mo»).** Las dos son **despejadas**: los saldos iniciales (498,9 mo y 125 mo) se han elegido para que el saldo de §7 dé esas cifras, porque ninguna vista enseña un saldo inicial de asentamiento. Así que su prueba comprueba la fórmula y la suma del libro (−15.830.000 mh en Bree y −4.000.000 en Archet), no unos datos independientes.

**Reglas de la especificación que implementa:**

- **El saldo (§7).** «**Saldo** de una bolsa o caja = saldo inicial + suma de sus movimientos no programados.» `saldoDeCaja` filtra por `dominioId`, así que se le puede pasar el libro entero de la partida.
- **`ImpuestoRenta` gana `categoriaId` (decisión 3).** «Valor inicial: `cat.impuestos` (ingreso), `cat.rentas-y-alquileres` (ingreso con `edificioId`) y `cat.tributos` (tributo).» El ejemplo añade `cat.aranceles` para los aranceles del mercado, que es la categoría que A2 enseña en sus movimientos.
- **Salarios y soldadas agrupados (decisión 16).** «`regla { tipo: 'salarios' | 'soldadas', id: dominioId }`, con detalle opcional por trabajador o unidad.» La suma de `detalleTrabajo[].importe.base` tiene que dar `abs(importe.base)`: 6 × 0,3 + 3 × 0,3 + 2 × 0,4 + 2 × 0,3 + 1 × 0,1 = **4,2 mo** en salarios y 6 × 0,3 + 4 × 0,5 + 1 × 2 = **5,8 mo** en soldadas.
- **El cobro agrupado de los locales (§7).** «Impuesto de un local = máx(pct × producción, mínimo).» Con las producciones habituales de marzo: máx(10 % × 10 mo; 0,2 mo) + máx(8 % × 40 mo; 0,5 mo) + máx(5 % × 6 mo; 0,1 mo) + máx(5 % × 4 mo; 0,1 mo) = 1 + 3,2 + 0,3 + 0,2 = **4,7 mo = 470.000 mh**, que es lo que suma `detalleLocales`.
- **Los locales, en marzo (decisión 2).** «Los locales comerciales se dan de alta en marzo de 1640 (`cobradoHasta` nace en febrero y el único cobro es el del 1 de abril).» Los cuatro llevan `alta` el 1 de marzo, un solo tramo de `cambiosEstado` desde ese día y `cobradoHasta` en marzo de 1640, que es lo que dejó el cobro del 1 de abril.
- **Categoría de los movimientos de caravanas (decisión 11).** «Víveres del almacén» cuando el recurso es víveres y «Comercio» en los demás. La compra de Tharbad es de víveres, así que lleva `CATEGORIA.viveresDelAlmacen`, y no hay ninguna otra.
- **Las dos caras de una transferencia (§8).** «Cada lado guarda su concepto en su movimiento.» El de Bree es −2.000.000 con concepto «Transferencia a Tharan» y el de Tharan, +2.000.000 con «Transferencia desde Bree»; los dos con `tipo: 'transferencia'` y el mismo `vinculo`.
- **Historial corto (decisión 2).** Ningún movimiento de los asentamientos es anterior al **20 de marzo de 1640** (el coste de la obra del molino de Archet) y ninguna de sus 16 reglas empieza el 31 de marzo ni antes.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/ejemplo/asentamientosDinero.ts`
- Prueba: `src/dominio/ejemplo/asentamientosDinero.test.ts`

- [ ] **Paso 1: Escribir la prueba que falla**

La prueba comprueba las dos cajas con la fórmula de §7, que los 16 movimientos pasan `EsquemaMovimiento` y que lo tecleado cuadra con su importe, que los tres movimientos agrupados cuadran con su detalle, las dos caras de la transferencia, la categoría de la caravana de víveres, las dos reglas del historial corto, las siete `categoriaId` de la decisión 3, el alta de los locales en marzo, los recuentos de la plantilla y de la guarnición, y la deuda del Gremio con su movimiento de alta.

Crea `src/dominio/ejemplo/asentamientosDinero.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { compararFechas, type Fecha } from '../calendario/fecha'
import { CATEGORIA, OPCIONES_INICIALES } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { aBase } from '../dinero/importe'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { saldoDeCaja } from '../dinero/saldo'
import {
  EsquemaImpuestoRenta,
  EsquemaLocalComercial,
  EsquemaTipoLocal,
  EsquemaTrabajador,
  EsquemaUnidadGuarnicion,
} from '../modelo/asentamiento'
import { EsquemaDeuda } from '../modelo/deudas'
import { EsquemaMovimiento, EsquemaTransferencia } from '../modelo/movimientos'
import {
  CAJAS_ASENTAMIENTOS,
  DEUDAS_ASENTAMIENTOS,
  IMPUESTOS_RENTAS,
  LOCALES_COMERCIALES,
  MOVIMIENTOS_ARCHET,
  MOVIMIENTOS_BREE,
  TIPOS_LOCAL,
  TRABAJADORES,
  TRANSFERENCIAS,
  UNIDADES_GUARNICION,
} from './asentamientosDinero'
import { DOM, LOCAL, MOV_BREE, MOV_THARAN } from './ids'
import { MOVIMIENTOS_THARAN, PARTIDA } from './partidaYPersonaje'

const EQ = EQUIVALENCIAS_POR_DEFECTO

/** El libro entero de la partida: el saldo de una caja mira los movimientos de todos los dominios (§7). */
const TODOS_LOS_MOVIMIENTOS = [...MOVIMIENTOS_THARAN, ...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]

/** El 20 de marzo de 1640: el día del movimiento más antiguo de los asentamientos (decisión 2). */
const ARRANQUE_DE_LOS_ASENTAMIENTOS: Fecha = { anio: 1640, mes: 3, dia: 20 }

/** El 31 de marzo de 1640: ninguna regla de los asentamientos empieza ese día ni antes (decisión 2). */
const FIN_DE_MARZO: Fecha = { anio: 1640, mes: 3, dia: 31 }

/** La primera fecha de una recurrencia, que unos tipos llaman `primera` y otros `inicio` (§8). */
function primeraFecha(recurrencia: { primera?: Fecha; inicio?: Fecha; fecha?: Fecha }): Fecha | undefined {
  return recurrencia.primera ?? recurrencia.inicio ?? recurrencia.fecha
}

describe('las cajas de Bree y de Archet', () => {
  it('la caja de Bree da 34.060.000 mh, que se escribe «340,6 mo» (§7, A2)', () => {
    const caja = CAJAS_ASENTAMIENTOS[0]
    expect(caja.dominioId).toBe(DOM.bree)
    expect(caja.saldoInicial.base).toBe(49890000)
    expect(MOVIMIENTOS_BREE.reduce((total, m) => total + m.importe.base, 0)).toBe(-15830000)
    const saldo = saldoDeCaja(caja, TODOS_LOS_MOVIMIENTOS)
    expect(saldo).toBe(34060000)
    expect(formatearOro(saldo, EQ)).toBe('340,6 mo')
  })

  it('la caja de Archet da 8.500.000 mh, que se escribe «85 mo» (§7, Inicio)', () => {
    const caja = CAJAS_ASENTAMIENTOS[1]
    expect(caja.dominioId).toBe(DOM.archet)
    expect(caja.saldoInicial.base).toBe(12500000)
    const saldo = saldoDeCaja(caja, TODOS_LOS_MOVIMIENTOS)
    expect(saldo).toBe(8500000)
    expect(formatearOro(saldo, EQ)).toBe('85 mo')
  })
})

describe('los libros de los asentamientos', () => {
  it('los 16 movimientos pasan el esquema, no están programados y lo tecleado cuadra (§3, §8)', () => {
    expect(MOVIMIENTOS_BREE).toHaveLength(15)
    expect(MOVIMIENTOS_ARCHET).toHaveLength(1)
    for (const movimiento of [...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]) {
      expect(EsquemaMovimiento.safeParse(movimiento).success).toBe(true)
      expect(movimiento.programado).toBe(false)
      const introducido = movimiento.importe.introducido
      if (introducido !== undefined) {
        expect(aBase(introducido.cantidad, introducido.moneda, PARTIDA.equivalencias)).toBe(
          Math.abs(movimiento.importe.base),
        )
      }
    }
  })

  it('los movimientos agrupados cuadran con su detalle (§9, decisión 16)', () => {
    const locales = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.locales)
    expect(locales?.detalleLocales).toHaveLength(4)
    expect(locales?.detalleLocales?.reduce((suma, d) => suma + d.impuesto.base, 0)).toBe(470000)
    expect(locales?.importe.base).toBe(470000)

    const salarios = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.salarios6Abril)
    expect(salarios?.detalleTrabajo).toHaveLength(5)
    expect(salarios?.detalleTrabajo?.reduce((suma, d) => suma + d.importe.base, 0)).toBe(420000)
    expect(salarios?.importe.base).toBe(-420000)

    const soldadas = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.soldadas10Abril)
    expect(soldadas?.detalleTrabajo).toHaveLength(3)
    expect(soldadas?.detalleTrabajo?.reduce((suma, d) => suma + d.importe.base, 0)).toBe(580000)
    expect(soldadas?.importe.base).toBe(-580000)
  })

  it('la transferencia del 6 de abril tiene sus dos movimientos, uno en cada dominio (§8)', () => {
    expect(TRANSFERENCIAS).toHaveLength(1)
    const transferencia = TRANSFERENCIAS[0]
    expect(EsquemaTransferencia.safeParse(transferencia).success).toBe(true)
    expect(transferencia.saleDeId).toBe(DOM.bree)
    expect(transferencia.entraEnId).toBe(DOM.tharan)
    const sale = MOVIMIENTOS_BREE.find((m) => m.id === transferencia.movimientoSaleId)
    const entra = MOVIMIENTOS_THARAN.find((m) => m.id === transferencia.movimientoEntraId)
    expect(sale?.importe.base).toBe(-2000000)
    expect(entra?.importe.base).toBe(2000000)
    expect(sale?.tipo).toBe('transferencia')
    expect(entra?.tipo).toBe('transferencia')
    expect(entra?.id).toBe(MOV_THARAN.transferencia)
  })

  it('la compra de víveres usa «Víveres del almacén» y nadie más (decisión 11)', () => {
    const conViveres = MOVIMIENTOS_BREE.filter((m) => m.categoriaId === CATEGORIA.viveresDelAlmacen)
    expect(conViveres.map((m) => m.id)).toEqual([MOV_BREE.caravanaTharbad])
    expect(conViveres[0].importe.base).toBe(-7500000)
  })

  it('no hay movimientos anteriores al 20 de marzo ni reglas anteriores al 31 de marzo (decisión 2)', () => {
    for (const movimiento of [...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]) {
      expect(compararFechas(movimiento.fecha, ARRANQUE_DE_LOS_ASENTAMIENTOS)).toBeGreaterThanOrEqual(0)
    }
    const recurrencias = [
      ...IMPUESTOS_RENTAS.map((i) => i.recurrencia),
      ...TRABAJADORES.map((t) => t.recurrencia),
      ...UNIDADES_GUARNICION.map((u) => u.recurrencia),
    ]
    expect(recurrencias).toHaveLength(16)
    for (const recurrencia of recurrencias) {
      const primera = primeraFecha(recurrencia)
      expect(primera).toBeDefined()
      expect(compararFechas(primera as Fecha, FIN_DE_MARZO)).toBeGreaterThan(0)
    }
  })
})

describe('las reglas de los asentamientos', () => {
  it('los siete ingresos y tributos llevan su categoriaId (decisión 3)', () => {
    expect(IMPUESTOS_RENTAS).toHaveLength(7)
    const categorias = new Set(OPCIONES_INICIALES.filter((o) => o.lista === 'categorias').map((o) => o.id))
    for (const impuesto of IMPUESTOS_RENTAS) {
      expect(EsquemaImpuestoRenta.safeParse(impuesto).success).toBe(true)
      expect(categorias.has(impuesto.categoriaId)).toBe(true)
    }
    expect(IMPUESTOS_RENTAS.map((i) => i.categoriaId)).toEqual([
      CATEGORIA.impuestos,
      CATEGORIA.aranceles,
      CATEGORIA.rentasYAlquileres,
      CATEGORIA.impuestos,
      CATEGORIA.tributos,
      CATEGORIA.tributos,
      CATEGORIA.rentasYAlquileres,
    ])
  })

  it('los cuatro locales se dan de alta en marzo y solo han cobrado el 1 de abril (decisión 2)', () => {
    expect(TIPOS_LOCAL).toHaveLength(3)
    for (const tipo of TIPOS_LOCAL) {
      expect(EsquemaTipoLocal.safeParse(tipo).success).toBe(true)
      expect(tipo.diaCobro).toBe(1)
    }
    expect(LOCALES_COMERCIALES).toHaveLength(4)
    for (const local of LOCALES_COMERCIALES) {
      expect(EsquemaLocalComercial.safeParse(local).success).toBe(true)
      expect(local.alta).toEqual({ anio: 1640, mes: 3, dia: 1 })
      expect(local.cobradoHasta).toEqual({ anio: 1640, mes: 3 })
      expect(local.cambiosEstado).toEqual([{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }])
    }
    const telas = LOCALES_COMERCIALES.find((l) => l.id === LOCAL.tiendaDeTelas)
    expect(telas?.producciones).toHaveLength(1)
    expect(telas?.producciones[0].mes).toEqual({ anio: 1640, mes: 4 })
  })

  it('Bree paga 4,2 mo a 14 trabajadores y 5,8 mo a 11 soldados (§6.3, A5 y A6)', () => {
    const deBree = TRABAJADORES.filter((t) => t.dominioId === DOM.bree)
    expect(deBree).toHaveLength(5)
    expect(deBree.reduce((suma, t) => suma + t.numero, 0)).toBe(14)
    expect(deBree.reduce((suma, t) => suma + t.numero * t.salario.base, 0)).toBe(420000)
    for (const trabajador of TRABAJADORES) {
      expect(EsquemaTrabajador.safeParse(trabajador).success).toBe(true)
    }
    expect(UNIDADES_GUARNICION.reduce((suma, u) => suma + u.numero, 0)).toBe(11)
    expect(UNIDADES_GUARNICION.reduce((suma, u) => suma + u.numero * u.soldada.base, 0)).toBe(580000)
    for (const unidad of UNIDADES_GUARNICION) {
      expect(EsquemaUnidadGuarnicion.safeParse(unidad).success).toBe(true)
    }
  })

  it('la única deuda de Bree es el adelanto del Gremio, con su movimiento de alta (§6.3, A2b)', () => {
    expect(DEUDAS_ASENTAMIENTOS).toHaveLength(1)
    const deuda = DEUDAS_ASENTAMIENTOS[0]
    expect(EsquemaDeuda.safeParse(deuda).success).toBe(true)
    expect(deuda.principal.base).toBe(3000000)
    expect(deuda.cuentaAltaId).toBe(DOM.bree)
    const alta = MOVIMIENTOS_BREE.find((m) => m.id === MOV_BREE.adelantoGranero)
    expect(alta?.vinculo).toEqual({ tipo: 'altaDeuda', id: deuda.id })
    expect(alta?.importe.base).toBe(3000000)
  })
})
```

- [ ] **Paso 2: Ejecutar la prueba y ver que falla**

```bash
npx vitest run src/dominio/ejemplo/asentamientosDinero.test.ts
```

Fallo esperado: Vitest no encuentra el módulo `./asentamientosDinero`, que todavía no existe. La hora, la duración y el corte de las líneas citadas pueden variar:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/ejemplo/asentamientosDinero.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/ejemplo/asentamientosDinero.test.ts [ src/dominio/ejemplo/asentamientosDinero.test.ts ]
Error: Cannot find module './asentamientosDinero' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/ejemplo/asentamientosDinero.test.ts
 ❯ src/dominio/ejemplo/asentamientosDinero.test.ts:17:1
     15| import { EsquemaDeuda } from '../modelo/deudas'
     16| import { EsquemaMovimiento, EsquemaTransferencia } from '../modelo/mov…
     17| import {
       | ^
     18|   CAJAS_ASENTAMIENTOS,
     19|   DEUDAS_ASENTAMIENTOS,


 Test Files  1 failed (1)
      Tests  no tests
```

- [ ] **Paso 3: Escribir el dinero de los dos asentamientos**

Crea `src/dominio/ejemplo/asentamientosDinero.ts` con este contenido:

```ts
import { CATEGORIA, idDeOpcion } from '../catalogo/inicial'
import type { ImpuestoRenta, LocalComercial, TipoLocal, Trabajador, UnidadGuarnicion } from '../modelo/asentamiento'
import type { Deuda } from '../modelo/deudas'
import type { Caja } from '../modelo/dominios'
import type { Movimiento, Transferencia } from '../modelo/movimientos'
import {
  AVANCE,
  CARAVANA,
  DEUDA,
  DOM,
  EDIFICIO,
  IMPUESTO,
  LOCAL,
  MOV_ARCHET,
  MOV_BREE,
  MOV_THARAN,
  OBRA,
  PERSONA,
  TIPO_LOCAL,
  TRABAJADOR,
  TRANSFERENCIA,
  UNIDAD,
} from './ids'

/** El 1 de abril de 1640: el día en que arrancan todas las reglas recurrentes del ejemplo (decisión 2). */
const PRIMERO_DE_ABRIL = { anio: 1640, mes: 4, dia: 1 }

/**
 * Las cajas de los dos asentamientos (§8). Los dos saldos iniciales están **despejados** para que el saldo de
 * §7 (inicial + movimientos no programados) dé las cifras de las vistas:
 * Bree 49.890.000 − 15.830.000 = 34.060.000 mh (340,6 mo) y Archet 12.500.000 − 4.000.000 = 8.500.000 mh (85 mo).
 */
export const CAJAS_ASENTAMIENTOS: Caja[] = [
  {
    dominioId: DOM.bree,
    saldoInicial: { base: 49890000, introducido: { cantidad: '498,9', moneda: 'mo' } },
  },
  {
    dominioId: DOM.archet,
    saldoInicial: { base: 12500000, introducido: { cantidad: '125', moneda: 'mo' } },
  },
]

/**
 * La tesorería de Bree: 15 movimientos que suman −15.830.000 mh (§6.3, A2).
 * Los automáticos los crearon los avances del 6, del 10 y del 12 de abril; los manuales son el adelanto del
 * Gremio del 28 de marzo, la transferencia a Tharan y el pago de la obra de la puerta.
 */
export const MOVIMIENTOS_BREE: Movimiento[] = [
  {
    id: MOV_BREE.adelantoGranero,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 3, dia: 28 },
    tipo: 'ingreso',
    importe: { base: 3000000, introducido: { cantidad: '30', moneda: 'mo' } },
    categoriaId: CATEGORIA.prestamosYDeudas,
    concepto: 'Adelanto para el granero',
    origen: 'manual',
    vinculo: { tipo: 'altaDeuda', id: DEUDA.gremioBree },
    programado: false,
  },
  {
    id: MOV_BREE.impuestoHogar,
    dominioId: DOM.bree,
    fecha: PRIMERO_DE_ABRIL,
    tipo: 'ingreso',
    importe: { base: 1240000 },
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Impuesto por hogar',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'impuesto', id: IMPUESTO.hogar },
    programado: false,
  },
  {
    id: MOV_BREE.locales,
    dominioId: DOM.bree,
    fecha: PRIMERO_DE_ABRIL,
    tipo: 'ingreso',
    importe: { base: 470000 },
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Impuestos de locales · marzo (4)',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'locales', id: DOM.bree },
    detalleLocales: [
      {
        localId: LOCAL.herreria1,
        nombre: 'Herrería 1',
        mes: { anio: 1640, mes: 3 },
        produccion: { base: 1000000 },
        anotada: false,
        impuesto: { base: 100000 },
      },
      {
        localId: LOCAL.posada,
        nombre: 'Posada El Poney Pisador',
        mes: { anio: 1640, mes: 3 },
        produccion: { base: 4000000 },
        anotada: false,
        impuesto: { base: 320000 },
      },
      {
        localId: LOCAL.tiendaDeTelas,
        nombre: 'Tienda de telas',
        mes: { anio: 1640, mes: 3 },
        produccion: { base: 600000 },
        anotada: false,
        impuesto: { base: 30000 },
      },
      {
        localId: LOCAL.ultramarinos,
        nombre: 'Ultramarinos del camino',
        mes: { anio: 1640, mes: 3 },
        produccion: { base: 400000 },
        anotada: false,
        impuesto: { base: 20000 },
      },
    ],
    programado: false,
  },
  {
    id: MOV_BREE.aranceles1Abril,
    dominioId: DOM.bree,
    fecha: PRIMERO_DE_ABRIL,
    tipo: 'ingreso',
    importe: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
    categoriaId: CATEGORIA.aranceles,
    concepto: 'Aranceles del mercado',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'impuesto', id: IMPUESTO.aranceles },
    programado: false,
  },
  {
    id: MOV_BREE.caravanaTharbad,
    dominioId: DOM.bree,
    fecha: PRIMERO_DE_ABRIL,
    tipo: 'gasto',
    importe: { base: -7500000, introducido: { cantidad: '75', moneda: 'mo' } },
    categoriaId: CATEGORIA.viveresDelAlmacen,
    concepto: 'Caravana: compra de víveres en Tharbad',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    vinculo: { tipo: 'caravana', id: CARAVANA.compraViveresTharbad },
    programado: false,
  },
  {
    id: MOV_BREE.peaje6Abril,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'ingreso',
    importe: { base: 180000 },
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Peaje del camino · 6 días',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'impuesto', id: IMPUESTO.peaje },
    programado: false,
  },
  {
    id: MOV_BREE.salarios6Abril,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'gasto',
    importe: { base: -420000 },
    categoriaId: CATEGORIA.salarios,
    concepto: 'Salarios de 14 trabajadores',
    origen: 'avance',
    avanceId: AVANCE.hasta6Abril,
    regla: { tipo: 'salarios', id: DOM.bree },
    detalleTrabajo: [
      { origenId: TRABAJADOR.granjeros, nombre: 'Granjeros', numero: 6, importe: { base: 180000 } },
      { origenId: TRABAJADOR.lenadores, nombre: 'Leñadores', numero: 3, importe: { base: 90000 } },
      { origenId: TRABAJADOR.cerveceros, nombre: 'Cerveceros', numero: 2, importe: { base: 80000 } },
      { origenId: TRABAJADOR.canteros, nombre: 'Canteros', numero: 2, importe: { base: 60000 } },
      { origenId: TRABAJADOR.pastores, nombre: 'Pastores', numero: 1, importe: { base: 10000 } },
    ],
    programado: false,
  },
  {
    id: MOV_BREE.transferencia,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'transferencia',
    importe: { base: -2000000, introducido: { cantidad: '20', moneda: 'mo' } },
    categoriaId: CATEGORIA.transferencias,
    concepto: 'Transferencia a Tharan',
    origen: 'manual',
    vinculo: { tipo: 'transferencia', id: TRANSFERENCIA.breeATharan },
    programado: false,
  },
  {
    id: MOV_BREE.obraPuerta,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    tipo: 'gasto',
    importe: { base: -3000000, introducido: { cantidad: '30', moneda: 'mo' } },
    categoriaId: CATEGORIA.obras,
    concepto: 'Obra: reparación de la puerta del sur',
    origen: 'manual',
    vinculo: { tipo: 'obra', id: OBRA.puerta },
    programado: false,
  },
  {
    id: MOV_BREE.aranceles8Abril,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 8 },
    tipo: 'ingreso',
    importe: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
    categoriaId: CATEGORIA.aranceles,
    concepto: 'Aranceles del mercado',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'impuesto', id: IMPUESTO.aranceles },
    programado: false,
  },
  {
    id: MOV_BREE.soldadas10Abril,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -580000 },
    categoriaId: CATEGORIA.soldadas,
    concepto: 'Soldada de la guarnición',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'soldadas', id: DOM.bree },
    detalleTrabajo: [
      { origenId: UNIDAD.guardias, nombre: 'Guardias de la puerta', numero: 6, importe: { base: 180000 } },
      { origenId: UNIDAD.arqueros, nombre: 'Arqueros de la empalizada', numero: 4, importe: { base: 200000 } },
      { origenId: UNIDAD.capitan, nombre: 'Capitán de la guardia', numero: 1, importe: { base: 200000 } },
    ],
    programado: false,
  },
  {
    id: MOV_BREE.alquilerMolino,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'ingreso',
    importe: { base: 500000, introducido: { cantidad: '5', moneda: 'mo' } },
    categoriaId: CATEGORIA.rentasYAlquileres,
    concepto: 'Alquiler del molino',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'impuesto', id: IMPUESTO.alquilerMolino },
    programado: false,
  },
  {
    id: MOV_BREE.obraGranero,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'gasto',
    importe: { base: -8500000, introducido: { cantidad: '85', moneda: 'mo' } },
    categoriaId: CATEGORIA.obras,
    concepto: 'Obra: nuevo granero',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    vinculo: { tipo: 'obra', id: OBRA.granero },
    programado: false,
  },
  {
    id: MOV_BREE.peaje10Abril,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 10 },
    tipo: 'ingreso',
    importe: { base: 120000 },
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Peaje del camino · 4 días',
    origen: 'avance',
    avanceId: AVANCE.hasta10Abril,
    regla: { tipo: 'impuesto', id: IMPUESTO.peaje },
    programado: false,
  },
  {
    id: MOV_BREE.peaje12Abril,
    dominioId: DOM.bree,
    fecha: { anio: 1640, mes: 4, dia: 12 },
    tipo: 'ingreso',
    importe: { base: 60000 },
    categoriaId: CATEGORIA.impuestos,
    concepto: 'Peaje del camino · 2 días',
    origen: 'avance',
    avanceId: AVANCE.hasta12Abril,
    regla: { tipo: 'impuesto', id: IMPUESTO.peaje },
    programado: false,
  },
]

/** El único movimiento de Archet: el coste de la obra del molino, pagado al empezarla (§6.3, A9). */
export const MOVIMIENTOS_ARCHET: Movimiento[] = [
  {
    id: MOV_ARCHET.obraMolino,
    dominioId: DOM.archet,
    fecha: { anio: 1640, mes: 3, dia: 20 },
    tipo: 'gasto',
    importe: { base: -4000000, introducido: { cantidad: '40', moneda: 'mo' } },
    categoriaId: CATEGORIA.obras,
    concepto: 'Obra: molino',
    origen: 'manual',
    vinculo: { tipo: 'obra', id: OBRA.molinoArchet },
    programado: false,
  },
]

/** Las dos caras de la transferencia del 6 de abril: 20 mo de la caja de Bree a la bolsa de Tharan (§8). */
export const TRANSFERENCIAS: Transferencia[] = [
  {
    id: TRANSFERENCIA.breeATharan,
    fecha: { anio: 1640, mes: 4, dia: 6 },
    importe: { base: 2000000, introducido: { cantidad: '20', moneda: 'mo' } },
    saleDeId: DOM.bree,
    entraEnId: DOM.tharan,
    movimientoSaleId: MOV_BREE.transferencia,
    movimientoEntraId: MOV_THARAN.transferencia,
  },
]

/** La única deuda de Bree: el adelanto del Gremio para el granero, que vence el 1 de junio (§6.3, A2b). */
export const DEUDAS_ASENTAMIENTOS: Deuda[] = [
  {
    id: DEUDA.gremioBree,
    dominioId: DOM.bree,
    sentido: 'debo',
    contraparteId: PERSONA.gremioBree,
    fecha: { anio: 1640, mes: 3, dia: 28 },
    principal: { base: 3000000, introducido: { cantidad: '30', moneda: 'mo' } },
    interesPct: 0,
    vencimiento: { anio: 1640, mes: 6, dia: 1 },
    notas: 'Adelanto para el granero',
    estado: 'abierta',
    impago: false,
    cuentaAltaId: DOM.bree,
    pagos: [],
    devengos: [],
  },
]

/**
 * Los ingresos, rentas y tributos de los dos asentamientos (§6.3, A3). Cada uno lleva su `categoriaId`
 * (decisión 3): Impuestos, Aranceles, Rentas y alquileres o Tributos.
 */
export const IMPUESTOS_RENTAS: ImpuestoRenta[] = [
  {
    id: IMPUESTO.hogar,
    dominioId: DOM.bree,
    sentido: 'ingreso',
    concepto: 'Impuesto por hogar',
    base: 'porHabitante',
    importe: { base: 1000, introducido: { cantidad: '0,01', moneda: 'mo' } },
    categoriaId: CATEGORIA.impuestos,
    recurrencia: { tipo: 'mensual', diaMes: 1, inicio: PRIMERO_DE_ABRIL },
  },
  {
    id: IMPUESTO.aranceles,
    dominioId: DOM.bree,
    sentido: 'ingreso',
    concepto: 'Aranceles del mercado',
    base: 'fija',
    importe: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
    categoriaId: CATEGORIA.aranceles,
    recurrencia: { tipo: 'semanal', diaSemana: 6, inicio: PRIMERO_DE_ABRIL },
  },
  {
    id: IMPUESTO.alquilerMolino,
    dominioId: DOM.bree,
    sentido: 'ingreso',
    concepto: 'Alquiler del molino',
    base: 'fija',
    importe: { base: 500000, introducido: { cantidad: '5', moneda: 'mo' } },
    categoriaId: CATEGORIA.rentasYAlquileres,
    recurrencia: { tipo: 'mensual', diaMes: 10, inicio: PRIMERO_DE_ABRIL },
    edificioId: EDIFICIO.molino,
  },
  {
    id: IMPUESTO.peaje,
    dominioId: DOM.bree,
    sentido: 'ingreso',
    concepto: 'Peaje del camino',
    base: 'fija',
    importe: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
    categoriaId: CATEGORIA.impuestos,
    recurrencia: { tipo: 'diaria', inicio: PRIMERO_DE_ABRIL },
  },
  {
    id: IMPUESTO.diezmo,
    dominioId: DOM.bree,
    sentido: 'tributo',
    concepto: 'Diezmo a Fornost',
    base: 'fija',
    importe: { base: 2500000, introducido: { cantidad: '25', moneda: 'mo' } },
    categoriaId: CATEGORIA.tributos,
    recurrencia: { tipo: 'mensual', diaMes: 30, inicio: PRIMERO_DE_ABRIL },
    destinatarioId: PERSONA.corona,
  },
  {
    id: IMPUESTO.tributoArchet,
    dominioId: DOM.archet,
    sentido: 'tributo',
    concepto: 'Tributo a la Corona',
    base: 'fija',
    importe: { base: 6000000, introducido: { cantidad: '60', moneda: 'mo' } },
    categoriaId: CATEGORIA.tributos,
    recurrencia: { tipo: 'trimestral', diaMes: 19, primera: { anio: 1640, mes: 4, dia: 19 } },
    destinatarioId: PERSONA.corona,
  },
  {
    id: IMPUESTO.rentasArchet,
    dominioId: DOM.archet,
    sentido: 'ingreso',
    concepto: 'Rentas de las tierras',
    base: 'fija',
    importe: { base: 2580000, introducido: { cantidad: '25,8', moneda: 'mo' } },
    categoriaId: CATEGORIA.rentasYAlquileres,
    recurrencia: { tipo: 'trimestral', diaMes: 1, primera: { anio: 1640, mes: 6, dia: 1 } },
  },
]

/** Los tres tipos de local de Bree: porcentaje, mínimo y día de cobro (§7, A3b). */
export const TIPOS_LOCAL: TipoLocal[] = [
  {
    id: TIPO_LOCAL.herreria,
    dominioId: DOM.bree,
    nombre: 'Herrería',
    pct: 10,
    minimo: { base: 20000, introducido: { cantidad: '2', moneda: 'mp' } },
    diaCobro: 1,
  },
  {
    id: TIPO_LOCAL.posada,
    dominioId: DOM.bree,
    nombre: 'Posada',
    pct: 8,
    minimo: { base: 50000, introducido: { cantidad: '5', moneda: 'mp' } },
    diaCobro: 1,
  },
  {
    id: TIPO_LOCAL.tienda,
    dominioId: DOM.bree,
    nombre: 'Tienda',
    pct: 5,
    minimo: { base: 10000, introducido: { cantidad: '1', moneda: 'mp' } },
    diaCobro: 1,
  },
]

/**
 * Los cuatro locales comerciales de Bree (§6.3, A3b). Todos se dan de alta el 1 de marzo de 1640 con
 * `cobradoHasta` naciendo en febrero, y el único cobro es el del 1 de abril, que deja `cobradoHasta` en
 * marzo de 1640 (decisión 2).
 */
export const LOCALES_COMERCIALES: LocalComercial[] = [
  {
    id: LOCAL.herreria1,
    dominioId: DOM.bree,
    nombre: 'Herrería 1',
    tipoId: TIPO_LOCAL.herreria,
    titularId: PERSONA.hobart,
    produccionHabitual: { base: 1000000, introducido: { cantidad: '10', moneda: 'mo' } },
    cambiosEstado: [{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }],
    alta: { anio: 1640, mes: 3, dia: 1 },
    cobradoHasta: { anio: 1640, mes: 3 },
    producciones: [],
  },
  {
    id: LOCAL.posada,
    dominioId: DOM.bree,
    nombre: 'Posada El Poney Pisador',
    tipoId: TIPO_LOCAL.posada,
    titularId: PERSONA.barnabas,
    produccionHabitual: { base: 4000000, introducido: { cantidad: '40', moneda: 'mo' } },
    cambiosEstado: [{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }],
    alta: { anio: 1640, mes: 3, dia: 1 },
    cobradoHasta: { anio: 1640, mes: 3 },
    producciones: [],
  },
  {
    id: LOCAL.tiendaDeTelas,
    dominioId: DOM.bree,
    nombre: 'Tienda de telas',
    tipoId: TIPO_LOCAL.tienda,
    produccionHabitual: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
    cambiosEstado: [{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }],
    alta: { anio: 1640, mes: 3, dia: 1 },
    cobradoHasta: { anio: 1640, mes: 3 },
    producciones: [
      {
        mes: { anio: 1640, mes: 4 },
        importe: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
        nota: 'Vendió poco con las lluvias',
      },
    ],
  },
  {
    id: LOCAL.ultramarinos,
    dominioId: DOM.bree,
    nombre: 'Ultramarinos del camino',
    tipoId: TIPO_LOCAL.tienda,
    produccionHabitual: { base: 400000, introducido: { cantidad: '4', moneda: 'mo' } },
    cambiosEstado: [{ desde: { anio: 1640, mes: 3, dia: 1 }, estado: 'abierto' }],
    alta: { anio: 1640, mes: 3, dia: 1 },
    cobradoHasta: { anio: 1640, mes: 3 },
    producciones: [],
  },
]

/** Las plantillas de los dos asentamientos: 14 trabajadores en Bree y 4 albañiles en Archet (§6.3, A5). */
export const TRABAJADORES: Trabajador[] = [
  {
    id: TRABAJADOR.granjeros,
    dominioId: DOM.bree,
    oficioId: idDeOpcion('oficios', 'Granjero'),
    numero: 6,
    salario: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
    recurrencia: { tipo: 'semanal', diaSemana: 4, inicio: PRIMERO_DE_ABRIL },
    edificioId: EDIFICIO.granjas,
  },
  {
    id: TRABAJADOR.lenadores,
    dominioId: DOM.bree,
    oficioId: idDeOpcion('oficios', 'Leñador'),
    numero: 3,
    salario: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
    recurrencia: { tipo: 'semanal', diaSemana: 4, inicio: PRIMERO_DE_ABRIL },
    edificioId: EDIFICIO.aserradero,
  },
  {
    id: TRABAJADOR.cerveceros,
    dominioId: DOM.bree,
    oficioId: idDeOpcion('oficios', 'Cervecero'),
    numero: 2,
    salario: { base: 40000, introducido: { cantidad: '0,4', moneda: 'mo' } },
    recurrencia: { tipo: 'semanal', diaSemana: 4, inicio: PRIMERO_DE_ABRIL },
    edificioId: EDIFICIO.cerveceria,
  },
  {
    id: TRABAJADOR.canteros,
    dominioId: DOM.bree,
    oficioId: idDeOpcion('oficios', 'Cantero'),
    numero: 2,
    salario: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
    recurrencia: { tipo: 'semanal', diaSemana: 4, inicio: PRIMERO_DE_ABRIL },
    edificioId: EDIFICIO.cantera,
  },
  {
    id: TRABAJADOR.pastores,
    dominioId: DOM.bree,
    oficioId: idDeOpcion('oficios', 'Pastor'),
    numero: 1,
    salario: { base: 10000, introducido: { cantidad: '0,1', moneda: 'mo' } },
    recurrencia: { tipo: 'semanal', diaSemana: 4, inicio: PRIMERO_DE_ABRIL },
    edificioId: EDIFICIO.redil,
  },
  {
    id: TRABAJADOR.albanilesArchet,
    dominioId: DOM.archet,
    oficioId: idDeOpcion('oficios', 'Albañil'),
    numero: 4,
    salario: { base: 80000, introducido: { cantidad: '0,8', moneda: 'mo' } },
    recurrencia: { tipo: 'mensual', diaMes: 26, inicio: { anio: 1640, mes: 4, dia: 13 } },
  },
]

/** Las tres unidades de la guarnición de Bree: 11 soldados y 5,8 mo por pago quincenal (§6.3, A6). */
export const UNIDADES_GUARNICION: UnidadGuarnicion[] = [
  {
    id: UNIDAD.guardias,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposUnidad', 'Guardia'),
    nombre: 'Guardias de la puerta',
    numero: 6,
    soldada: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
    recurrencia: { tipo: 'quincenal', primera: { anio: 1640, mes: 4, dia: 10 } },
  },
  {
    id: UNIDAD.arqueros,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposUnidad', 'Arquero'),
    nombre: 'Arqueros de la empalizada',
    numero: 4,
    soldada: { base: 50000, introducido: { cantidad: '0,5', moneda: 'mo' } },
    recurrencia: { tipo: 'quincenal', primera: { anio: 1640, mes: 4, dia: 10 } },
  },
  {
    id: UNIDAD.capitan,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposUnidad', 'Capitán'),
    nombre: 'Capitán de la guardia',
    numero: 1,
    soldada: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
    recurrencia: { tipo: 'quincenal', primera: { anio: 1640, mes: 4, dia: 10 } },
  },
]
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/dominio/ejemplo/asentamientosDinero.test.ts
```

Salida esperada (la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  11:14:09
   Duration  648ms (transform 49%, import 44%, tests 6%, worker 1%)
```

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 528 pruebas en 44 archivos. La tarea 18 dejó 516 pruebas en 43 archivos, y esta tarea trae **12 nuevas**: las 11 de `asentamientosDinero.test.ts` y **una más** en `pureza.test.ts`, que ahora recorre también `ejemplo/asentamientosDinero.ts`.

```text
 Test Files  44 passed (44)
      Tests  528 passed (528)
```

- [ ] **Paso 6: Commit**

```bash
git add src/dominio/ejemplo/asentamientosDinero.ts src/dominio/ejemplo/asentamientosDinero.test.ts
git commit -m "feat(ejemplo): el dinero de Bree y de Archet, con sus locales y su guarnición" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/ejemplo/asentamientosDinero.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/asentamientosDinero.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 7b04d19] feat(ejemplo): el dinero de Bree y de Archet, con sus locales y su guarnición
 2 files changed, 796 insertions(+)
 create mode 100644 src/dominio/ejemplo/asentamientosDinero.test.ts
 create mode 100644 src/dominio/ejemplo/asentamientosDinero.ts
```

**Avisos que esta tarea deja escritos:**

1. Los dos saldos iniciales son **despejados** y no salen de ninguna vista: si alguien añade o quita un movimiento del libro de Bree, tiene que volver a despejar 49.890.000 mh para que la caja siga dando 340,6 mo. La prueba lo detecta enseguida.
2. Con el historial corto de la decisión 2, P7 diría «Salarios · 1 movimiento» y no «12», y la deuda saldada con Barnabás Mantecona (saldada el 2 de marzo, §6.3) **no** entra en el ejemplo, porque su pago obligaría a un movimiento de principios de marzo. Barnabás se queda solo como titular de la posada.
3. El evento «Incursión de bandidos en el camino» (del 20 al 24 de marzo, tarea 20) se queda sin movimientos a los que afectar, porque el peaje empieza el 1 de abril. Es la consecuencia que ya anunciaba la decisión 2.

---

### Tarea 20 · Ejemplo: asentamientos, almacén y avances

Esta tarea cierra el ejemplo. Escribe lo que le falta a Bree y a Archet —población, almacén, edificios con sus producciones, la producción que el motor ya dejó anotada, obras, defensas, mercados, rutas, caravanas, animales, armería y eventos—, los **cuatro avances** de la partida con el `snapshotPrevio` del último, y la función que lo junta todo en un `DocumentoPartida`.

Es la tarea en la que el ejemplo pasa por primera vez las tres validaciones de la tarea 13, **sobre el documento y sobre el snapshot**. Si algún id apunta a un registro que no existe, si un nombre se repite o si una fecha no cuadra con la fecha actual, el paso 8 lo dice con su ruta y su mensaje. Depende de la tarea 19.

Son tres archivos nuevos y sus tres pruebas, en este orden, porque `avances.ts` importa las colecciones de `asentamientosAlmacen.ts` y `sombraDelEste.ts` importa a los dos:

| Archivo | Qué trae |
|---|---|
| `asentamientosAlmacen.ts` | poblaciones, existencias, ajustes, edificios, producción realizada, obras, defensas, mercados, rutas, caravanas, animales, armería y eventos |
| `avances.ts` | los cuatro avances y el `snapshotPrevio` del último, que es el estado completo del 10 de abril |
| `sombraDelEste.ts` | `documentoDeEjemplo()` y `catalogosDeEjemplo()` |

**Reglas de la especificación que implementa:**

- **Los habitantes (§7).** «Habitantes = iniciales + suma de los cambios con fecha hasta ese día.» Bree: 1.214 + (−6 + 20 + 12) = **1.240**. Los víveres no son un consumo guardado: salen de la ración (`diasPorSaco` = 30), así que `Poblacion.consumos` solo lleva la cerveza (0,003 por habitante) y la leña (0,008, que descuenta de la **madera**).
- **El almacén (§6.3, A8).** Siete filas en Bree con su capacidad, y «hoy caben 890 sacos más» = 1.200 − 310. Archet tiene una sola fila, víveres, **sin capacidad**: sin capacidad no hay límite (§6.3).
- **El acumulado de una producción (§7).** «Del día siguiente a la ocurrencia anterior al día de la ocurrencia.» El 12 de abril ya está procesado, así que las cinco producciones semanales llevan cinco días acumulados desde el 8 (las granjas, con las lluvias del 8 de abril, 5 × 0,8 = 4; la cantera, con 2 canteros de 3, 5 × 2/3 = 10/3) y la arcilla, once desde el 2 (11 × 2/3 = 22/3). La frecuencia de una producción **no admite «Una sola vez»** (§6.4), y `EsquemaRecurrenciaProduccion` lo impide.
- **Producción ya ocurrida (decisión 1).** El estado guarda `ProduccionRealizada { id, fecha, edificioId, produccionId, recursoId, cantidad, perdida, avanceId }`. En el ejemplo son seis: la arcilla del 1 de abril y las cinco del sábado 7, que son las dos marcas de producción pasada que enseña P3.
- **Fin de una obra (§7).** Fin = inicio + `diasTotales` − 1. La puerta del sur: 6 de abril + 11 = **17 de abril**; el molino de Archet: 20 de marzo + 39 = **28 de abril**, que es la marca «Fin obra molino (Archet)» del calendario. Una obra **planificada** no tiene `inicio` ni ha descontado nada (§7), así que «Ampliar la cervecería» va sin `inicio` y sin `movimientoId`.
- **Caravanas (§7).** «Vuelta = salida + 2 × días de viaje.» Fornost está a 4 días: 10 + 8 = 18 de abril. Tharbad, a 12: 1 + 24 = 25 de abril. En una **venta** los recursos salen al salir y el dinero entra al volver, así que la de cerveza no tiene todavía ningún movimiento; la **compra** pagó al salir y guarda su `movimientoSalidaId`.
- **El mercado local (§6.3 y decisión propia 20).** A0 crea siempre el mercado local del asentamiento, con su nombre y sin precios. Por eso hay cuatro mercados: Bree y Archet (locales) más Fornost y Tharbad. Que el mercado local lleve el nombre de su asentamiento es lo que comprueba `validarCoherenciaInterna`, y por eso la unicidad de nombres de mercado **exceptúa** a los locales.
- **Calendario de avances (decisión 5).** «… → 31/3, 31/3 → 6/4, 6/4 → 10/4, 10/4 → 12/4 de 1640.» El primero arranca en la fecha inicial (1 de enero) y **no crea nada**, porque todas las reglas empiezan el 1 de abril (decisión 2).
- **El snapshot, solo en el último (decisión 4).** «`snapshotPrevio` solo en el último. El snapshot es el estado completo de la partida sin la lista de avances y sin los catálogos de la app.» Aquí es el estado al cierre del **10 de abril**: sin los tres movimientos que creó el último avance, con dos días más de víveres, madera y cerveza en los almacenes y con los acumulados dos días más cortos.
- **Fechas y avances (§6.1, §9).** `fechaActual` tiene que ser igual al `hasta` del último avance, los avances van ordenados y sin solaparse, y **solo el último** guarda el snapshot. Lo comprueba `validarCoherenciaInterna` (tarea 13).
- **Forma del documento (decisión 6).** `{ partida, ...colecciones..., avances }`: **34 claves de estado** más `avances`, sin `id` de primer nivel y sin `partidaId` dentro.

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

**Archivos:**
- Crear: `src/dominio/ejemplo/asentamientosAlmacen.ts`, `src/dominio/ejemplo/avances.ts`, `src/dominio/ejemplo/sombraDelEste.ts`
- Prueba: `src/dominio/ejemplo/asentamientosAlmacen.test.ts`, `src/dominio/ejemplo/avances.test.ts`, `src/dominio/ejemplo/sombraDelEste.test.ts`

- [ ] **Paso 1: Escribir las tres pruebas que fallan**

Las tres se escriben de una vez y se ejecutan juntas: los tres módulos se implementan en los pasos 3, 4 y 5 y el proyecto no vuelve a verde hasta que están los tres.

Crea `src/dominio/ejemplo/asentamientosAlmacen.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { compararFechas, sumarDias } from '../calendario/fecha'
import { RECURSO, RECURSOS_INICIALES } from '../catalogo/inicial'
import { formatearOro } from '../dinero/formato'
import { EQUIVALENCIAS_POR_DEFECTO } from '../dinero/monedas'
import { EsquemaExistencia, EsquemaPoblacion, EsquemaProduccionRealizada } from '../modelo/almacen'
import { EsquemaAnimal, EsquemaEdificio, EsquemaObjetoArmeria, EsquemaObra } from '../modelo/asentamiento'
import { EsquemaCaravana, EsquemaMercado, EsquemaRuta } from '../modelo/comercio'
import { EsquemaEventoNarrativo } from '../modelo/eventos'
import {
  AJUSTES_EXISTENCIAS,
  ANIMALES,
  ARMERIA_BREE,
  CARAVANAS,
  DEFENSAS,
  EDIFICIOS,
  ENTRADAS_ALMACEN,
  EVENTOS,
  EXISTENCIAS,
  MERCADOS,
  OBRAS,
  POBLACIONES,
  PRODUCCIONES_REALIZADAS,
  RUTAS,
} from './asentamientosAlmacen'
import { MOV_ARCHET, MOV_BREE, DOM, EDIFICIO, OBRA } from './ids'
import { PARTIDA } from './partidaYPersonaje'

const EQ = EQUIVALENCIAS_POR_DEFECTO

describe('población y almacén', () => {
  it('Bree tiene 1.240 habitantes y 7 filas de almacén; Archet, 310 y una sola fila (§7, A4 y A8)', () => {
    expect(POBLACIONES).toHaveLength(2)
    for (const poblacion of POBLACIONES) {
      expect(EsquemaPoblacion.safeParse(poblacion).success).toBe(true)
    }
    const bree = POBLACIONES[0]
    expect(bree.habitantesIniciales).toBe(1214)
    expect(bree.cambios.reduce((suma, c) => suma + c.delta, 0)).toBe(26)
    expect(bree.habitantesIniciales + bree.cambios.reduce((suma, c) => suma + c.delta, 0)).toBe(1240)
    expect(bree.consumos.map((c) => c.recursoId)).toEqual([RECURSO.cerveza, RECURSO.madera])
    expect(POBLACIONES[1].habitantesIniciales).toBe(310)
    expect(POBLACIONES[1].consumos).toEqual([])

    for (const existencia of EXISTENCIAS) {
      expect(EsquemaExistencia.safeParse(existencia).success).toBe(true)
    }
    const deBree = EXISTENCIAS.filter((e) => e.dominioId === DOM.bree)
    expect(deBree).toHaveLength(7)
    const viveres = deBree[0]
    expect(viveres.recursoId).toBe(RECURSO.viveres)
    expect(viveres.cantidad).toBe(310)
    expect((viveres.capacidad ?? 0) - viveres.cantidad).toBe(890)
    const deArchet = EXISTENCIAS.filter((e) => e.dominioId === DOM.archet)
    expect(deArchet).toHaveLength(1)
    expect(deArchet[0].cantidad).toBe(900)
    expect(deArchet[0].capacidad).toBeUndefined()
    expect(AJUSTES_EXISTENCIAS).toHaveLength(1)
    expect(ENTRADAS_ALMACEN).toEqual([])
    const recursos = new Set(RECURSOS_INICIALES.map((r) => r.id))
    for (const existencia of EXISTENCIAS) {
      expect(recursos.has(existencia.recursoId)).toBe(true)
    }
  })
})

describe('edificios y producción', () => {
  it('los seis edificios de Bree tienen seis producciones con sus acumulados del 12 de abril (§6.3, A7)', () => {
    expect(EDIFICIOS).toHaveLength(6)
    for (const edificio of EDIFICIOS) {
      expect(EsquemaEdificio.safeParse(edificio).success).toBe(true)
      expect(edificio.dominioId).toBe(DOM.bree)
    }
    const producciones = EDIFICIOS.flatMap((e) => e.producciones)
    expect(producciones).toHaveLength(6)
    for (const produccion of producciones) {
      expect(produccion.recurrencia.tipo === 'semanal' || produccion.recurrencia.tipo === 'mensual').toBe(true)
      expect(compararFechas(produccion.acumulado.desde, PARTIDA.fechaActual)).toBeLessThan(0)
    }
    const cantera = EDIFICIOS.find((e) => e.id === EDIFICIO.cantera)
    expect(cantera?.producciones.map((p) => p.acumulado.sumaFactores)).toEqual([10 / 3, 22 / 3])
    const molino = EDIFICIOS.find((e) => e.id === EDIFICIO.molino)
    expect(molino?.estado).toBe('alquilado')
    expect(molino?.producciones).toEqual([])
  })

  it('las seis producciones ya ocurridas apuntan a su edificio y a su producción (decisión 1)', () => {
    expect(PRODUCCIONES_REALIZADAS).toHaveLength(6)
    const porEdificio = new Map(EDIFICIOS.map((e) => [e.id, e]))
    for (const realizada of PRODUCCIONES_REALIZADAS) {
      expect(EsquemaProduccionRealizada.safeParse(realizada).success).toBe(true)
      const edificio = porEdificio.get(realizada.edificioId)
      expect(edificio).toBeDefined()
      const produccion = edificio?.producciones.find((p) => p.id === realizada.produccionId)
      expect(produccion).toBeDefined()
      expect(produccion?.recursoId).toBe(realizada.recursoId)
      expect(realizada.perdida).toBe(0)
      expect(compararFechas(realizada.fecha, PARTIDA.fechaActual)).toBeLessThan(0)
    }
    expect(PRODUCCIONES_REALIZADAS.filter((p) => p.fecha.dia === 7)).toHaveLength(5)
  })
})

describe('obras, comercio, animales y eventos', () => {
  it('las cuatro obras cuadran con sus fechas y con sus movimientos (§7, A9)', () => {
    expect(OBRAS).toHaveLength(4)
    for (const obra of OBRAS) {
      expect(EsquemaObra.safeParse(obra).success).toBe(true)
    }
    const puerta = OBRAS.find((o) => o.id === OBRA.puerta)
    expect(puerta?.movimientoId).toBe(MOV_BREE.obraPuerta)
    expect(sumarDias(puerta?.inicio ?? PARTIDA.fechaActual, (puerta?.diasTotales ?? 1) - 1)).toEqual({
      anio: 1640,
      mes: 4,
      dia: 17,
    })
    const granero = OBRAS.find((o) => o.id === OBRA.granero)
    expect(granero?.efecto).toEqual({ tipo: 'ampliarAlmacen', recursoId: RECURSO.viveres, valor: 800 })
    expect(granero?.movimientoId).toBe(MOV_BREE.obraGranero)
    const cerveceria = OBRAS.find((o) => o.id === OBRA.cerveceria)
    expect(cerveceria?.estado).toBe('planificada')
    expect(cerveceria?.inicio).toBeUndefined()
    expect(cerveceria?.movimientoId).toBeUndefined()
    const molino = OBRAS.find((o) => o.id === OBRA.molinoArchet)
    expect(molino?.dominioId).toBe(DOM.archet)
    expect(molino?.movimientoId).toBe(MOV_ARCHET.obraMolino)
    expect(sumarDias(molino?.inicio ?? PARTIDA.fechaActual, (molino?.diasTotales ?? 1) - 1)).toEqual({
      anio: 1640,
      mes: 4,
      dia: 28,
    })
    expect(DEFENSAS).toHaveLength(3)
  })

  it('los cuatro mercados, las dos rutas y las dos caravanas en ruta (§6.3, A10)', () => {
    expect(MERCADOS).toHaveLength(4)
    for (const mercado of MERCADOS) {
      expect(EsquemaMercado.safeParse(mercado).success).toBe(true)
    }
    expect(MERCADOS.filter((m) => m.localDe !== undefined).map((m) => m.nombre)).toEqual(['Bree', 'Archet'])
    expect(RUTAS).toHaveLength(2)
    for (const ruta of RUTAS) {
      expect(EsquemaRuta.safeParse(ruta).success).toBe(true)
      expect(ruta.origenId).toBe(DOM.bree)
    }
    expect(RUTAS.map((r) => r.diasViaje)).toEqual([4, 12])
    expect(CARAVANAS).toHaveLength(2)
    for (const caravana of CARAVANAS) {
      expect(EsquemaCaravana.safeParse(caravana).success).toBe(true)
      expect(caravana.estado).toBe('enRuta')
    }
    expect(CARAVANAS[1].movimientoSalidaId).toBe(MOV_BREE.caravanaTharbad)
    expect(CARAVANAS[0].movimientoSalidaId).toBeUndefined()
  })

  it('11 filas de animales (178 cabezas, 473,6 mo), 9 de armería (104 piezas, 230,4 mo) y 4 eventos', () => {
    expect(ANIMALES).toHaveLength(11)
    for (const animal of ANIMALES) {
      expect(EsquemaAnimal.safeParse(animal).success).toBe(true)
    }
    expect(ANIMALES.reduce((suma, a) => suma + a.cantidad, 0)).toBe(178)
    const valorAnimales = ANIMALES.reduce((suma, a) => suma + a.cantidad * (a.valorUnitario?.base ?? 0), 0)
    expect(valorAnimales).toBe(47360000)
    expect(formatearOro(valorAnimales, EQ)).toBe('473,6 mo')

    expect(ARMERIA_BREE).toHaveLength(9)
    for (const objeto of ARMERIA_BREE) {
      expect(EsquemaObjetoArmeria.safeParse(objeto).success).toBe(true)
    }
    expect(ARMERIA_BREE.reduce((suma, o) => suma + o.cantidad, 0)).toBe(104)
    const valorArmeria = ARMERIA_BREE.reduce((suma, o) => suma + o.cantidad * o.valorUnitario.base, 0)
    expect(valorArmeria).toBe(23040000)
    expect(formatearOro(valorArmeria, EQ)).toBe('230,4 mo')

    expect(EVENTOS).toHaveLength(4)
    for (const evento of EVENTOS) {
      expect(EsquemaEventoNarrativo.safeParse(evento).success).toBe(true)
      expect(evento.dominioId).toBe(DOM.bree)
    }
    expect(EVENTOS.filter((e) => e.efectos.length === 0)).toHaveLength(1)
  })
})
```

Crea `src/dominio/ejemplo/avances.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { compararFechas } from '../calendario/fecha'
import { saldoDeCaja } from '../dinero/saldo'
import { EsquemaAvance, EsquemaEstadoPartida } from '../modelo/documento'
import { AVANCES, SNAPSHOT_10_ABRIL } from './avances'
import { CAJAS_ASENTAMIENTOS, MOVIMIENTOS_ARCHET, MOVIMIENTOS_BREE } from './asentamientosDinero'
import { AVANCE, DOM, MOV_BREE, MOV_THARAN } from './ids'
import { CAJA_THARAN, MOVIMIENTOS_THARAN, PARTIDA } from './partidaYPersonaje'

describe('los cuatro avances', () => {
  it('van de la fecha inicial a la fecha actual, en orden y sin solaparse (decisión 5, §4.4)', () => {
    expect(AVANCES).toHaveLength(4)
    expect(AVANCES.map((a) => a.id)).toEqual([
      AVANCE.hasta31Marzo,
      AVANCE.hasta6Abril,
      AVANCE.hasta10Abril,
      AVANCE.hasta12Abril,
    ])
    expect(AVANCES[0].desde).toEqual(PARTIDA.fechaInicial)
    expect(AVANCES[3].hasta).toEqual(PARTIDA.fechaActual)
    for (const avance of AVANCES) {
      expect(EsquemaAvance.safeParse(avance).success).toBe(true)
      expect(compararFechas(avance.desde, avance.hasta)).toBeLessThan(0)
    }
    for (let i = 1; i < AVANCES.length; i += 1) {
      expect(compararFechas(AVANCES[i - 1].hasta, AVANCES[i].desde)).toBeLessThanOrEqual(0)
      expect(AVANCES[i - 1].aplicadoEl <= AVANCES[i].aplicadoEl).toBe(true)
    }
    expect(AVANCES.map((a) => `${a.hasta.dia}/${a.hasta.mes}`)).toEqual(['31/3', '6/4', '10/4', '12/4'])
  })

  it('solo el último guarda snapshotPrevio, y es el estado del 10 de abril (decisión 4)', () => {
    expect(AVANCES.filter((a) => a.snapshotPrevio !== undefined)).toHaveLength(1)
    expect(AVANCES[3].snapshotPrevio).toBe(SNAPSHOT_10_ABRIL)
    expect(EsquemaEstadoPartida.safeParse(SNAPSHOT_10_ABRIL).success).toBe(true)
    expect(Object.keys(SNAPSHOT_10_ABRIL)).toHaveLength(34)
    expect(Object.keys(SNAPSHOT_10_ABRIL)).not.toContain('avances')
    expect(SNAPSHOT_10_ABRIL.partida.fechaActual).toEqual({ anio: 1640, mes: 4, dia: 10 })
    expect(SNAPSHOT_10_ABRIL.partida.cambiosDesdeUltimoAvance).toBe(3)
  })

  it('los saldos «antes» y «después» de cada avance cuadran con el libro (§P5)', () => {
    const ultimo = AVANCES[3]
    const saldos = ultimo.cambios.filter((c) => c.tipo === 'saldo')
    expect(saldos).toHaveLength(3)
    const todos = [...MOVIMIENTOS_THARAN, ...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET]
    expect(saldos.find((c) => c.tipo === 'saldo' && c.dominioId === DOM.tharan)).toMatchObject({
      antes: 4675800,
      despues: saldoDeCaja(CAJA_THARAN, todos),
      movimientos: 2,
    })
    expect(saldos.find((c) => c.tipo === 'saldo' && c.dominioId === DOM.bree)).toMatchObject({
      antes: 34000000,
      despues: saldoDeCaja(CAJAS_ASENTAMIENTOS[0], todos),
      movimientos: 1,
    })
    expect(saldos.find((c) => c.tipo === 'saldo' && c.dominioId === DOM.archet)).toMatchObject({
      antes: 8500000,
      despues: saldoDeCaja(CAJAS_ASENTAMIENTOS[1], todos),
      movimientos: 0,
    })
    expect(ultimo.avisos).toEqual([
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril',
      },
    ])
  })

  it('el snapshot no tiene los tres movimientos del último avance y su almacén es el del 10 (decisión 4)', () => {
    expect(SNAPSHOT_10_ABRIL.movimientos).toHaveLength(26)
    const ids = SNAPSHOT_10_ABRIL.movimientos.map((m) => m.id)
    expect(ids).not.toContain(MOV_THARAN.posada12Abril)
    expect(ids).not.toContain(MOV_THARAN.establo12Abril)
    expect(ids).not.toContain(MOV_BREE.peaje12Abril)
    expect(saldoDeCaja(CAJA_THARAN, SNAPSHOT_10_ABRIL.movimientos)).toBe(4675800)
    expect(saldoDeCaja(CAJAS_ASENTAMIENTOS[0], SNAPSHOT_10_ABRIL.movimientos)).toBe(34000000)
    const viveresDeBree = SNAPSHOT_10_ABRIL.existencias[0]
    expect(viveresDeBree.cantidad).toBeCloseTo(392.6667, 4)
    expect(SNAPSHOT_10_ABRIL.existencias[7].cantidad).toBeCloseTo(920.6667, 4)
    expect(SNAPSHOT_10_ABRIL.edificios[0].producciones[0].acumulado.sumaFactores).toBe(2.4)
  })
})
```

Crea `src/dominio/ejemplo/sombraDelEste.test.ts` con este contenido:

```ts
import { describe, expect, it } from 'vitest'
import { EsquemaDocumentoPartida } from '../modelo/documento'
import { saldosPorDominio } from '../dinero/saldo'
import { detalleDeProblemas, validarCoherenciaInterna, validarCopia } from '../validacion/coherencia'
import { validarReferencias } from '../validacion/referencias'
import { validarUnicidades } from '../validacion/unicidades'
import { DOM } from './ids'
import { catalogosDeEjemplo, documentoDeEjemplo } from './sombraDelEste'

describe('documentoDeEjemplo', () => {
  it('junta las 34 claves del estado y la lista de avances, y devuelve un objeto nuevo (decisión 6)', () => {
    const documento = documentoDeEjemplo()
    expect(Object.keys(documento)).toHaveLength(35)
    expect(Object.keys(documento)[0]).toBe('partida')
    expect(Object.keys(documento).at(-1)).toBe('avances')
    expect(documento).not.toHaveProperty('id')
    expect(documento).not.toHaveProperty('partidaId')
    expect(documento.movimientos).toHaveLength(29)
    expect(documentoDeEjemplo()).not.toBe(documento)
    expect(documentoDeEjemplo().movimientos).not.toBe(documento.movimientos)
    expect(saldosPorDominio(documento)).toEqual({
      [DOM.tharan]: 4651800,
      [DOM.bree]: 34060000,
      [DOM.archet]: 8500000,
    })
  })

  it('pasa EsquemaDocumentoPartida y sobrevive a una vuelta por JSON (§6.1)', () => {
    const documento = documentoDeEjemplo()
    const analisis = EsquemaDocumentoPartida.safeParse(documento)
    expect(analisis.error).toBeUndefined()
    expect(analisis.success).toBe(true)
    const ida = JSON.parse(JSON.stringify(documento))
    expect(ida).toEqual(documento)
    expect(EsquemaDocumentoPartida.safeParse(ida).success).toBe(true)
  })

  it('no deja ni un problema en las tres validaciones, ni en el estado ni en el snapshot (§6.1)', () => {
    const documento = documentoDeEjemplo()
    const catalogos = catalogosDeEjemplo()
    expect(detalleDeProblemas(validarReferencias(documento, catalogos))).toBe('')
    expect(detalleDeProblemas(validarUnicidades(documento, catalogos))).toBe('')
    expect(detalleDeProblemas(validarCoherenciaInterna(documento))).toBe('')
    expect(detalleDeProblemas(validarCopia(documento, catalogos))).toBe('')
    expect(validarCopia(documento, catalogos)).toEqual([])
  })
})
```

- [ ] **Paso 2: Ejecutar las tres pruebas y verlas fallar**

```bash
npx vitest run src/dominio/ejemplo/asentamientosAlmacen.test.ts src/dominio/ejemplo/avances.test.ts src/dominio/ejemplo/sombraDelEste.test.ts
```

Fallo esperado: los tres módulos no existen. El orden de los tres bloques puede variar, y también la hora, la duración y el corte de las líneas citadas:

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ❯ src/dominio/ejemplo/avances.test.ts (0 test)
 ❯ src/dominio/ejemplo/asentamientosAlmacen.test.ts (0 test)
 ❯ src/dominio/ejemplo/sombraDelEste.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/dominio/ejemplo/asentamientosAlmacen.test.ts [ src/dominio/ejemplo/asentamientosAlmacen.test.ts ]
Error: Cannot find module './asentamientosAlmacen' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/ejemplo/asentamientosAlmacen.test.ts
 ❯ src/dominio/ejemplo/asentamientosAlmacen.test.ts:10:1
      8| import { EsquemaCaravana, EsquemaMercado, EsquemaRuta } from '../model…
      9| import { EsquemaEventoNarrativo } from '../modelo/eventos'
     10| import {
       | ^
     11|   AJUSTES_EXISTENCIAS,
     12|   ANIMALES,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  src/dominio/ejemplo/avances.test.ts [ src/dominio/ejemplo/avances.test.ts ]
Error: Cannot find module './avances' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/ejemplo/avances.test.ts
 ❯ src/dominio/ejemplo/avances.test.ts:5:1
      3| import { saldoDeCaja } from '../dinero/saldo'
      4| import { EsquemaAvance, EsquemaEstadoPartida } from '../modelo/documen…
      5| import { AVANCES, SNAPSHOT_10_ABRIL } from './avances'
       | ^
      6| import { CAJAS_ASENTAMIENTOS, MOVIMIENTOS_ARCHET, MOVIMIENTOS_BREE } f…
      7| import { AVANCE, DOM, MOV_BREE, MOV_THARAN } from './ids'

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  src/dominio/ejemplo/sombraDelEste.test.ts [ src/dominio/ejemplo/sombraDelEste.test.ts ]
Error: Cannot find module './sombraDelEste' imported from C:/Proyectos/GA/gestion_aldeas/src/dominio/ejemplo/sombraDelEste.test.ts
 ❯ src/dominio/ejemplo/sombraDelEste.test.ts:8:1
      6| import { validarUnicidades } from '../validacion/unicidades'
      7| import { DOM } from './ids'
      8| import { catalogosDeEjemplo, documentoDeEjemplo } from './sombraDelEst…
       | ^
      9|
     10| describe('documentoDeEjemplo', () => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  3 failed (3)
      Tests  no tests
```

- [ ] **Paso 3: Escribir la población, el almacén y el resto de los asentamientos**

Crea `src/dominio/ejemplo/asentamientosAlmacen.ts` con este contenido:

```ts
import { RECURSO, idDeOpcion } from '../catalogo/inicial'
import type {
  AjusteExistencias,
  EntradaAlmacen,
  Existencia,
  Poblacion,
  ProduccionRealizada,
} from '../modelo/almacen'
import type { Animal, Defensa, Edificio, ObjetoArmeria, Obra } from '../modelo/asentamiento'
import type { Caravana, Mercado, Ruta } from '../modelo/comercio'
import type { EventoNarrativo } from '../modelo/eventos'
import {
  AJUSTE_EXISTENCIAS,
  ANIMAL,
  ARMERIA,
  AVANCE,
  CAMBIO_POBLACION,
  CARAVANA,
  CONSUMO,
  DEFENSA,
  DOM,
  EDIFICIO,
  EVENTO,
  IMPUESTO,
  MERCADO,
  MOV_ARCHET,
  MOV_BREE,
  OBRA,
  PRODUCCION,
  PRODUCCION_REALIZADA,
} from './ids'

/** El 1 de abril de 1640: el día en que arrancan también las producciones de los edificios (decisión 2). */
const PRIMERO_DE_ABRIL = { anio: 1640, mes: 4, dia: 1 }

/**
 * Las dos poblaciones (§6.3, A4). Bree tiene 1.214 habitantes iniciales y tres cambios que suman +26, así que
 * el 12 de abril son 1.240. Los víveres no son un consumo guardado: salen de la ración (`diasPorSaco`).
 */
export const POBLACIONES: Poblacion[] = [
  {
    dominioId: DOM.bree,
    habitantesIniciales: 1214,
    cambios: [
      {
        id: CAMBIO_POBLACION.fiebres,
        fecha: { anio: 1640, mes: 2, dia: 14 },
        delta: -6,
        motivo: 'Fiebres de invierno',
      },
      {
        id: CAMBIO_POBLACION.hobbits,
        fecha: { anio: 1640, mes: 3, dia: 2 },
        delta: 20,
        motivo: 'Se instalan hobbits de la Comarca',
      },
      {
        id: CAMBIO_POBLACION.cardolan,
        fecha: PRIMERO_DE_ABRIL,
        delta: 12,
        motivo: 'Llegan familias huidas de Cardolan',
      },
    ],
    consumos: [
      { id: CONSUMO.cerveza, nombre: 'Cerveza', recursoId: RECURSO.cerveza, porHabitante: 0.003 },
      { id: CONSUMO.lena, nombre: 'Leña', recursoId: RECURSO.madera, porHabitante: 0.008 },
    ],
  },
  {
    dominioId: DOM.archet,
    habitantesIniciales: 310,
    cambios: [],
    consumos: [],
  },
]

/** El almacén de Bree (7 filas con capacidad) y el de Archet (víveres sin capacidad) (§6.3, A8). */
export const EXISTENCIAS: Existencia[] = [
  { dominioId: DOM.bree, recursoId: RECURSO.viveres, cantidad: 310, capacidad: 1200 },
  { dominioId: DOM.bree, recursoId: RECURSO.madera, cantidad: 420, capacidad: 600 },
  { dominioId: DOM.bree, recursoId: RECURSO.piedra, cantidad: 180, capacidad: 400 },
  { dominioId: DOM.bree, recursoId: RECURSO.arcilla, cantidad: 150, capacidad: 300 },
  { dominioId: DOM.bree, recursoId: RECURSO.hierro, cantidad: 64, capacidad: 200 },
  { dominioId: DOM.bree, recursoId: RECURSO.cerveza, cantidad: 90, capacidad: 150 },
  { dominioId: DOM.bree, recursoId: RECURSO.lana, cantidad: 35, capacidad: 100 },
  { dominioId: DOM.archet, recursoId: RECURSO.viveres, cantidad: 900 },
]

/** El único ajuste a mano del ejemplo (§6.4). El ajuste es solo el registro: la cantidad ya está guardada. */
export const AJUSTES_EXISTENCIAS: AjusteExistencias[] = [
  {
    id: AJUSTE_EXISTENCIAS.maderaPodrida,
    dominioId: DOM.bree,
    recursoId: RECURSO.madera,
    fecha: { anio: 1640, mes: 4, dia: 2 },
    delta: -5,
    motivo: 'Haces podridos por la humedad',
  },
]

/** El ejemplo no tiene compras ni recepciones directas de almacén: los víveres llegan en caravana (§6.3). */
export const ENTRADAS_ALMACEN: EntradaAlmacen[] = []

/**
 * Los seis edificios de Bree y sus seis producciones (§6.3, A7 y A7b). El molino está alquilado y por eso no
 * produce: su renta es el `ImpuestoRenta` «Alquiler del molino». Los acumulados son los del 12 de abril, que
 * ya está procesado: las granjas llevan 5 días con las lluvias (5 × 0,8 = 4) y la cantera, 2 canteros de 3.
 */
export const EDIFICIOS: Edificio[] = [
  {
    id: EDIFICIO.granjas,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Granja'),
    nombre: 'Granjas del Oeste',
    estado: 'activo',
    trabajadoresNecesarios: 6,
    producciones: [
      {
        id: PRODUCCION.granjasViveres,
        recursoId: RECURSO.viveres,
        cantidad: 90,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 4 },
      },
    ],
  },
  {
    id: EDIFICIO.aserradero,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Aserradero'),
    nombre: 'Aserradero',
    estado: 'activo',
    trabajadoresNecesarios: 3,
    producciones: [
      {
        id: PRODUCCION.aserraderoMadera,
        recursoId: RECURSO.madera,
        cantidad: 35,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 5 },
      },
    ],
  },
  {
    id: EDIFICIO.cerveceria,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Cervecería'),
    nombre: 'Cervecería',
    estado: 'activo',
    trabajadoresNecesarios: 2,
    producciones: [
      {
        id: PRODUCCION.cerveceriaCerveza,
        recursoId: RECURSO.cerveza,
        cantidad: 20,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 5 },
      },
    ],
  },
  {
    id: EDIFICIO.cantera,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Cantera'),
    nombre: 'Cantera',
    estado: 'activo',
    trabajadoresNecesarios: 3,
    producciones: [
      {
        id: PRODUCCION.canteraPiedra,
        recursoId: RECURSO.piedra,
        cantidad: 25,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 10 / 3 },
      },
      {
        id: PRODUCCION.canteraArcilla,
        recursoId: RECURSO.arcilla,
        cantidad: 10,
        recurrencia: { tipo: 'mensual', diaMes: 1, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 2 }, sumaFactores: 22 / 3 },
      },
    ],
  },
  {
    id: EDIFICIO.redil,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Redil'),
    nombre: 'Redil',
    estado: 'activo',
    trabajadoresNecesarios: 1,
    producciones: [
      {
        id: PRODUCCION.redilLana,
        recursoId: RECURSO.lana,
        cantidad: 12,
        recurrencia: { tipo: 'semanal', diaSemana: 5, inicio: PRIMERO_DE_ABRIL },
        acumulado: { desde: { anio: 1640, mes: 4, dia: 8 }, sumaFactores: 5 },
      },
    ],
  },
  {
    id: EDIFICIO.molino,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposEdificio', 'Molino'),
    nombre: 'Molino',
    estado: 'alquilado',
    trabajadoresNecesarios: 0,
    producciones: [],
  },
]

/**
 * Las seis producciones que ya ocurrieron y que el motor dejó anotadas (decisión 1): la arcilla del 1 de abril,
 * del periodo de un solo día que va del inicio de la regla a su primera ocurrencia, y las cinco semanales del
 * sábado 7 de abril, de un periodo de 7 días completo.
 */
export const PRODUCCIONES_REALIZADAS: ProduccionRealizada[] = [
  {
    id: PRODUCCION_REALIZADA.arcilla1Abril,
    fecha: PRIMERO_DE_ABRIL,
    edificioId: EDIFICIO.cantera,
    produccionId: PRODUCCION.canteraArcilla,
    recursoId: RECURSO.arcilla,
    cantidad: 2 / 9,
    perdida: 0,
    avanceId: AVANCE.hasta6Abril,
  },
  {
    id: PRODUCCION_REALIZADA.viveres7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.granjas,
    produccionId: PRODUCCION.granjasViveres,
    recursoId: RECURSO.viveres,
    cantidad: 90,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.madera7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.aserradero,
    produccionId: PRODUCCION.aserraderoMadera,
    recursoId: RECURSO.madera,
    cantidad: 35,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.cerveza7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.cerveceria,
    produccionId: PRODUCCION.cerveceriaCerveza,
    recursoId: RECURSO.cerveza,
    cantidad: 20,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.piedra7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.cantera,
    produccionId: PRODUCCION.canteraPiedra,
    recursoId: RECURSO.piedra,
    cantidad: 50 / 3,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
  {
    id: PRODUCCION_REALIZADA.lana7Abril,
    fecha: { anio: 1640, mes: 4, dia: 7 },
    edificioId: EDIFICIO.redil,
    produccionId: PRODUCCION.redilLana,
    recursoId: RECURSO.lana,
    cantidad: 12,
    perdida: 0,
    avanceId: AVANCE.hasta10Abril,
  },
]

/** Las cuatro obras: dos en curso y una planificada en Bree, y el molino de Archet (§6.3, A9). */
export const OBRAS: Obra[] = [
  {
    id: OBRA.puerta,
    dominioId: DOM.bree,
    nombre: 'Reparación de la puerta del sur',
    estado: 'enCurso',
    coste: { base: 3000000, introducido: { cantidad: '30', moneda: 'mo' } },
    materiales: { [RECURSO.madera]: 40, [RECURSO.hierro]: 20 },
    inicio: { anio: 1640, mes: 4, dia: 6 },
    diasTotales: 12,
    efecto: { tipo: 'repararDefensa', objetivoId: DEFENSA.puerta },
    movimientoId: MOV_BREE.obraPuerta,
  },
  {
    id: OBRA.granero,
    dominioId: DOM.bree,
    nombre: 'Nuevo granero',
    estado: 'enCurso',
    coste: { base: 8500000, introducido: { cantidad: '85', moneda: 'mo' } },
    materiales: { [RECURSO.madera]: 120, [RECURSO.piedra]: 60 },
    inicio: { anio: 1640, mes: 4, dia: 10 },
    diasTotales: 40,
    efecto: { tipo: 'ampliarAlmacen', recursoId: RECURSO.viveres, valor: 800 },
    movimientoId: MOV_BREE.obraGranero,
  },
  {
    id: OBRA.cerveceria,
    dominioId: DOM.bree,
    nombre: 'Ampliar la cervecería',
    estado: 'planificada',
    coste: { base: 4500000, introducido: { cantidad: '45', moneda: 'mo' } },
    materiales: { [RECURSO.madera]: 60, [RECURSO.piedra]: 30 },
    diasTotales: 20,
    efecto: { tipo: 'mejorarEdificio', objetivoId: EDIFICIO.cerveceria },
  },
  {
    id: OBRA.molinoArchet,
    dominioId: DOM.archet,
    nombre: 'Molino',
    estado: 'enCurso',
    coste: { base: 4000000, introducido: { cantidad: '40', moneda: 'mo' } },
    materiales: {},
    inicio: { anio: 1640, mes: 3, dia: 20 },
    diasTotales: 40,
    efecto: { tipo: 'crearEdificio', tipoId: idDeOpcion('tiposEdificio', 'Molino') },
    movimientoId: MOV_ARCHET.obraMolino,
  },
]

/** Las tres defensas de Bree; la puerta del sur está dañada y en reparación hasta el 17 (§6.3, A6). */
export const DEFENSAS: Defensa[] = [
  {
    id: DEFENSA.empalizada,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposDefensa', 'Empalizada'),
    nombre: 'Empalizada norte',
    estado: 'buena',
  },
  {
    id: DEFENSA.puerta,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposDefensa', 'Puerta'),
    nombre: 'Puerta del sur',
    estado: 'daniada',
  },
  {
    id: DEFENSA.torre,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposDefensa', 'Torre de vigía'),
    nombre: 'Torre de vigía',
    estado: 'buena',
  },
]

/** Los cuatro mercados: los dos locales, que llevan el nombre de su asentamiento, y Fornost y Tharbad (§6.3, A10). */
export const MERCADOS: Mercado[] = [
  {
    id: MERCADO.bree,
    nombre: 'Bree',
    localDe: DOM.bree,
    precios: [
      { recursoId: RECURSO.viveres, importe: { base: 40000, introducido: { cantidad: '4', moneda: 'mp' } } },
      { recursoId: RECURSO.madera, importe: { base: 10000 } },
      { recursoId: RECURSO.hierro, importe: { base: 100000 } },
      { recursoId: RECURSO.cerveza, importe: { base: 40000 } },
      { recursoId: RECURSO.piedra, importe: { base: 15000 } },
      { recursoId: RECURSO.arcilla, importe: { base: 10000 } },
    ],
  },
  { id: MERCADO.archet, nombre: 'Archet', localDe: DOM.archet, precios: [] },
  {
    id: MERCADO.fornost,
    nombre: 'Fornost',
    precios: [
      { recursoId: RECURSO.viveres, importe: { base: 30000, introducido: { cantidad: '3', moneda: 'mp' } } },
      { recursoId: RECURSO.madera, importe: { base: 15000 } },
      { recursoId: RECURSO.hierro, importe: { base: 80000 } },
      { recursoId: RECURSO.cerveza, importe: { base: 60000 } },
      { recursoId: RECURSO.piedra, importe: { base: 25000 } },
      { recursoId: RECURSO.arcilla, importe: { base: 15000 } },
    ],
  },
  {
    id: MERCADO.tharbad,
    nombre: 'Tharbad',
    precios: [
      { recursoId: RECURSO.viveres, importe: { base: 25000 } },
      { recursoId: RECURSO.madera, importe: { base: 10000 } },
      { recursoId: RECURSO.hierro, importe: { base: 120000 } },
      { recursoId: RECURSO.cerveza, importe: { base: 50000 } },
      { recursoId: RECURSO.piedra, importe: { base: 30000 } },
      { recursoId: RECURSO.arcilla, importe: { base: 8000 } },
    ],
  },
]

/** Las dos rutas de Bree; desde Archet no hay ninguna, y por eso no ve el mercado de Cavada Grande (§6.3). */
export const RUTAS: Ruta[] = [
  { origenId: DOM.bree, destino: { tipo: 'mercado', id: MERCADO.fornost }, diasViaje: 4 },
  { origenId: DOM.bree, destino: { tipo: 'mercado', id: MERCADO.tharbad }, diasViaje: 12 },
]

/**
 * Las dos caravanas en ruta (§6.3, A10). La de venta cobra al volver, así que todavía no tiene movimiento;
 * la de compra pagó al salir y su movimiento es el del 1 de abril.
 */
export const CARAVANAS: Caravana[] = [
  {
    id: CARAVANA.ventaCervezaFornost,
    dominioId: DOM.bree,
    operacion: 'venta',
    mercadoId: MERCADO.fornost,
    carga: { recursoId: RECURSO.cerveza, cantidad: 40 },
    precioUnidad: { base: 60000, introducido: { cantidad: '0,6', moneda: 'mo' } },
    importe: { base: 2400000, introducido: { cantidad: '24', moneda: 'mo' } },
    salida: { anio: 1640, mes: 4, dia: 10 },
    vuelta: { anio: 1640, mes: 4, dia: 18 },
    estado: 'enRuta',
  },
  {
    id: CARAVANA.compraViveresTharbad,
    dominioId: DOM.bree,
    operacion: 'compra',
    mercadoId: MERCADO.tharbad,
    carga: { recursoId: RECURSO.viveres, cantidad: 300 },
    precioUnidad: { base: 25000, introducido: { cantidad: '0,25', moneda: 'mo' } },
    importe: { base: 7500000, introducido: { cantidad: '75', moneda: 'mo' } },
    salida: PRIMERO_DE_ABRIL,
    vuelta: { anio: 1640, mes: 4, dia: 25 },
    estado: 'enRuta',
    movimientoSalidaId: MOV_BREE.caravanaTharbad,
  },
]

/** Las once filas de animales de Bree: 178 cabezas y 47.360.000 mh (473,6 mo) de valor anotado (§6.3, A12). */
export const ANIMALES: Animal[] = [
  {
    id: ANIMAL.vacas,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Vaca'),
    cantidad: 24,
    genero: 'hembra',
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
  },
  {
    id: ANIMAL.toro,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Toro'),
    cantidad: 1,
    genero: 'macho',
    valorUnitario: { base: 1200000, introducido: { cantidad: '12', moneda: 'mo' } },
  },
  {
    id: ANIMAL.bueyes,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Buey'),
    cantidad: 6,
    genero: 'macho',
    valorUnitario: { base: 800000, introducido: { cantidad: '8', moneda: 'mo' } },
  },
  {
    id: ANIMAL.caballosDeTiro,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Caballo de tiro'),
    cantidad: 8,
    genero: 'mixto',
    valorUnitario: { base: 1500000, introducido: { cantidad: '15', moneda: 'mo' } },
  },
  {
    id: ANIMAL.ponis,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Poni'),
    cantidad: 5,
    genero: 'mixto',
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
  },
  {
    id: ANIMAL.ovejas,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Oveja'),
    cantidad: 60,
    genero: 'hembra',
    valorUnitario: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
  },
  {
    id: ANIMAL.carneros,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Carnero'),
    cantidad: 4,
    genero: 'macho',
    valorUnitario: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
  },
  {
    id: ANIMAL.cerdos,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Cerdo'),
    cantidad: 18,
    genero: 'mixto',
    valorUnitario: { base: 120000, introducido: { cantidad: '1,2', moneda: 'mo' } },
  },
  { id: ANIMAL.gallinas, dominioId: DOM.bree, tipoId: idDeOpcion('tiposAnimal', 'Gallina'), cantidad: 45, genero: 'hembra' },
  { id: ANIMAL.gallos, dominioId: DOM.bree, tipoId: idDeOpcion('tiposAnimal', 'Gallo'), cantidad: 3, genero: 'macho' },
  {
    id: ANIMAL.perrosPastores,
    dominioId: DOM.bree,
    tipoId: idDeOpcion('tiposAnimal', 'Perro pastor'),
    cantidad: 4,
    genero: 'mixto',
  },
]

/** Las nueve filas de la armería de Bree: 104 piezas y 23.040.000 mh (230,4 mo) (§6.3, A6b). */
export const ARMERIA_BREE: ObjetoArmeria[] = [
  {
    id: ARMERIA.lanzas,
    dominioId: DOM.bree,
    nombre: 'Lanzas',
    cantidad: 20,
    valorUnitario: { base: 80000, introducido: { cantidad: '0,8', moneda: 'mo' } },
  },
  {
    id: ARMERIA.arcos,
    dominioId: DOM.bree,
    nombre: 'Arcos largos',
    cantidad: 6,
    valorUnitario: { base: 200000, introducido: { cantidad: '2', moneda: 'mo' } },
  },
  {
    id: ARMERIA.flechas,
    dominioId: DOM.bree,
    nombre: 'Flechas · haz de 20',
    cantidad: 30,
    valorUnitario: { base: 30000, introducido: { cantidad: '0,3', moneda: 'mo' } },
  },
  {
    id: ARMERIA.espadas,
    dominioId: DOM.bree,
    nombre: 'Espadas cortas',
    cantidad: 8,
    valorUnitario: { base: 300000, introducido: { cantidad: '3', moneda: 'mo' } },
  },
  {
    id: ARMERIA.escudos,
    dominioId: DOM.bree,
    nombre: 'Escudos redondos',
    cantidad: 12,
    valorUnitario: { base: 120000, introducido: { cantidad: '1,2', moneda: 'mo' } },
  },
  {
    id: ARMERIA.cotas,
    dominioId: DOM.bree,
    nombre: 'Cotas de malla',
    cantidad: 4,
    valorUnitario: { base: 2500000, introducido: { cantidad: '25', moneda: 'mo' } },
  },
  {
    id: ARMERIA.yelmos,
    dominioId: DOM.bree,
    nombre: 'Yelmos de hierro',
    cantidad: 10,
    valorUnitario: { base: 250000, introducido: { cantidad: '2,5', moneda: 'mo' } },
  },
  {
    id: ARMERIA.jubones,
    dominioId: DOM.bree,
    nombre: 'Jubones de cuero',
    cantidad: 12,
    valorUnitario: { base: 150000, introducido: { cantidad: '1,5', moneda: 'mo' } },
  },
  {
    id: ARMERIA.ballestas,
    dominioId: DOM.bree,
    nombre: 'Ballestas',
    cantidad: 2,
    valorUnitario: { base: 600000, introducido: { cantidad: '6', moneda: 'mo' } },
  },
]

/** Los cuatro eventos narrativos de Bree: uno activo, uno próximo y dos pasados (§6.3, A11). */
export const EVENTOS: EventoNarrativo[] = [
  {
    id: EVENTO.lluvias,
    dominioId: DOM.bree,
    nombre: 'Lluvias de primavera',
    inicio: { anio: 1640, mes: 4, dia: 8 },
    duracionDias: 14,
    efectos: [
      { ambito: 'produccion', objetivo: { tipo: 'edificio', id: EDIFICIO.granjas }, pct: -20 },
    ],
    notas: 'El máster anuncia lluvias intensas: los campos del oeste se encharcan.',
  },
  {
    id: EVENTO.feria,
    dominioId: DOM.bree,
    nombre: 'Feria de primavera',
    inicio: { anio: 1640, mes: 4, dia: 15 },
    duracionDias: 3,
    efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: IMPUESTO.aranceles }, pct: 500 }],
  },
  {
    id: EVENTO.bandidos,
    dominioId: DOM.bree,
    nombre: 'Incursión de bandidos en el camino',
    inicio: { anio: 1640, mes: 3, dia: 20 },
    duracionDias: 5,
    efectos: [{ ambito: 'ingresos', objetivo: { tipo: 'impuesto', id: IMPUESTO.peaje }, pct: -100 }],
  },
  {
    id: EVENTO.mensajero,
    dominioId: DOM.bree,
    nombre: 'Visita del mensajero real',
    inicio: PRIMERO_DE_ABRIL,
    duracionDias: 1,
    efectos: [],
  },
]
```

- [ ] **Paso 4: Escribir los cuatro avances y el snapshot del último**

El snapshot no se copia a mano: se arma con las mismas colecciones del estado, cambiando solo lo que cambió entre el 10 y el 12 de abril (la fecha actual, tres movimientos, cuatro existencias y seis acumulados). Así no puede quedar desfasado.

Crea `src/dominio/ejemplo/avances.ts` con este contenido:

```ts
import { RECURSO } from '../catalogo/inicial'
import type { Existencia } from '../modelo/almacen'
import type { Edificio } from '../modelo/asentamiento'
import type { Avance, EstadoPartida } from '../modelo/documento'
import type { Movimiento } from '../modelo/movimientos'
import {
  ANIMALES,
  AJUSTES_EXISTENCIAS,
  ARMERIA_BREE,
  CARAVANAS,
  DEFENSAS,
  EDIFICIOS,
  ENTRADAS_ALMACEN,
  EVENTOS,
  MERCADOS,
  OBRAS,
  POBLACIONES,
  PRODUCCIONES_REALIZADAS,
  RUTAS,
} from './asentamientosAlmacen'
import {
  CAJAS_ASENTAMIENTOS,
  DEUDAS_ASENTAMIENTOS,
  IMPUESTOS_RENTAS,
  LOCALES_COMERCIALES,
  MOVIMIENTOS_ARCHET,
  MOVIMIENTOS_BREE,
  TIPOS_LOCAL,
  TRABAJADORES,
  TRANSFERENCIAS,
  UNIDADES_GUARNICION,
} from './asentamientosDinero'
import { AVANCE, DOM, MOV_BREE, MOV_THARAN, PRODUCCION } from './ids'
import {
  CAJA_THARAN,
  DEUDAS_THARAN,
  DOMINIOS,
  HECHIZOS,
  INTENTOS,
  INVERSIONES,
  MOVIMIENTOS_THARAN,
  OBJETOS,
  PARTIDA,
  PERGAMINOS,
  PERSONAS,
  RECURRENTES_THARAN,
  UBICACIONES,
  VENTAS,
} from './partidaYPersonaje'

/** El 10 de abril de 1640: la fecha actual que guarda el snapshot del último avance. */
const DIEZ_DE_ABRIL = { anio: 1640, mes: 4, dia: 10 }

/** Los tres movimientos que creó el avance del 10 al 12 y que el snapshot todavía no tiene. */
const MOVIMIENTOS_DEL_ULTIMO_AVANCE: readonly string[] = [
  MOV_THARAN.posada12Abril,
  MOV_THARAN.establo12Abril,
  MOV_BREE.peaje12Abril,
]

/** Consumo diario de víveres de un asentamiento: habitantes ÷ diasPorSaco (§7). */
function viveresAlDia(habitantes: number): number {
  return habitantes / PARTIDA.diasPorSaco
}

/**
 * El almacén tal como estaba al cierre del 10 de abril: dos días de consumo más que el 12, sin producción
 * (el 11 es miércoles y el 12, jueves) y sin llegadas de caravanas.
 */
const EXISTENCIAS_10_ABRIL: Existencia[] = [
  { dominioId: DOM.bree, recursoId: RECURSO.viveres, cantidad: 310 + 2 * viveresAlDia(1240), capacidad: 1200 },
  { dominioId: DOM.bree, recursoId: RECURSO.madera, cantidad: 420 + 2 * (1240 * 0.008), capacidad: 600 },
  { dominioId: DOM.bree, recursoId: RECURSO.piedra, cantidad: 180, capacidad: 400 },
  { dominioId: DOM.bree, recursoId: RECURSO.arcilla, cantidad: 150, capacidad: 300 },
  { dominioId: DOM.bree, recursoId: RECURSO.hierro, cantidad: 64, capacidad: 200 },
  { dominioId: DOM.bree, recursoId: RECURSO.cerveza, cantidad: 90 + 2 * (1240 * 0.003), capacidad: 150 },
  { dominioId: DOM.bree, recursoId: RECURSO.lana, cantidad: 35, capacidad: 100 },
  { dominioId: DOM.archet, recursoId: RECURSO.viveres, cantidad: 900 + 2 * viveresAlDia(310) },
]

/** Lo que valía cada acumulado al cierre del 10 de abril: dos días menos que el 12. */
const ACUMULADO_10_ABRIL: Readonly<Record<string, number>> = {
  [PRODUCCION.granjasViveres]: 2.4,
  [PRODUCCION.aserraderoMadera]: 3,
  [PRODUCCION.cerveceriaCerveza]: 3,
  [PRODUCCION.canteraPiedra]: 2,
  [PRODUCCION.canteraArcilla]: 6,
  [PRODUCCION.redilLana]: 3,
}

/** Los mismos seis edificios, con el acumulado que tenían el 10 de abril. */
const EDIFICIOS_10_ABRIL: Edificio[] = EDIFICIOS.map((edificio) => ({
  ...edificio,
  producciones: edificio.producciones.map((produccion) => ({
    ...produccion,
    acumulado: { ...produccion.acumulado, sumaFactores: ACUMULADO_10_ABRIL[produccion.id] },
  })),
}))

/** Los movimientos que ya existían el 10 de abril: todos menos los tres del último avance. */
const MOVIMIENTOS_10_ABRIL: Movimiento[] = [
  ...MOVIMIENTOS_THARAN,
  ...MOVIMIENTOS_BREE,
  ...MOVIMIENTOS_ARCHET,
].filter((movimiento) => !MOVIMIENTOS_DEL_ULTIMO_AVANCE.includes(movimiento.id))

/**
 * La copia de la partida que guarda el último avance: el estado completo al cierre del 10 de abril, con los
 * tres registros manuales de ese día ya dentro (decisión 4). No lleva la lista de avances ni los catálogos.
 */
export const SNAPSHOT_10_ABRIL: EstadoPartida = {
  partida: {
    ...PARTIDA,
    fechaActual: DIEZ_DE_ABRIL,
    actualizada: '2026-09-08T19:30:00.000Z',
    cambiosDesdeUltimoAvance: 3,
  },
  dominios: DOMINIOS,
  cajas: [CAJA_THARAN, ...CAJAS_ASENTAMIENTOS],
  movimientos: MOVIMIENTOS_10_ABRIL,
  transferencias: TRANSFERENCIAS,
  deudas: [...DEUDAS_THARAN, ...DEUDAS_ASENTAMIENTOS],
  recurrentes: RECURRENTES_THARAN,
  objetos: OBJETOS,
  ventas: VENTAS,
  inversiones: INVERSIONES,
  hechizos: HECHIZOS,
  intentos: INTENTOS,
  pergaminos: PERGAMINOS,
  poblaciones: POBLACIONES,
  existencias: EXISTENCIAS_10_ABRIL,
  ajustesExistencias: AJUSTES_EXISTENCIAS,
  entradasAlmacen: ENTRADAS_ALMACEN,
  edificios: EDIFICIOS_10_ABRIL,
  produccionesRealizadas: PRODUCCIONES_REALIZADAS,
  trabajadores: TRABAJADORES,
  obras: OBRAS,
  impuestosRentas: IMPUESTOS_RENTAS,
  tiposLocal: TIPOS_LOCAL,
  localesComerciales: LOCALES_COMERCIALES,
  mercados: MERCADOS,
  rutas: RUTAS,
  caravanas: CARAVANAS,
  unidadesGuarnicion: UNIDADES_GUARNICION,
  defensas: DEFENSAS,
  animales: ANIMALES,
  armeria: ARMERIA_BREE,
  eventos: EVENTOS,
  ubicaciones: UBICACIONES,
  personas: PERSONAS,
}

/**
 * Los cuatro avances de la partida (decisión 5): … → 31/3, 31/3 → 6/4, 6/4 → 10/4 y 10/4 → 12/4.
 * El primero va desde la fecha inicial y no crea nada, porque todas las reglas empiezan el 1 de abril
 * (decisión 2). Solo el último guarda `snapshotPrevio` (decisión 4).
 */
export const AVANCES: Avance[] = [
  {
    id: AVANCE.hasta31Marzo,
    desde: PARTIDA.fechaInicial,
    hasta: { anio: 1640, mes: 3, dia: 31 },
    aplicadoEl: '2026-08-30T17:05:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4091800, despues: 4091800, movimientos: 0 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 49890000, despues: 49890000, movimientos: 0 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 12500000, despues: 12500000, movimientos: 0 },
      { tipo: 'hecho', texto: 'Sin movimientos: todas las reglas de la partida empiezan el 1 de abril.' },
    ],
    avisos: [],
  },
  {
    id: AVANCE.hasta6Abril,
    desde: { anio: 1640, mes: 3, dia: 31 },
    hasta: { anio: 1640, mes: 4, dia: 6 },
    aplicadoEl: '2026-09-05T18:10:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 1355800, despues: 1583800, movimientos: 3 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 52890000, despues: 47160000, movimientos: 6 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 8500000, movimientos: 0 },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Cobrados los impuestos de los cuatro locales por marzo.' },
      { tipo: 'hecho', dominioId: DOM.tharan, texto: 'El Gremio devengó 2 mo de interés el 1 de abril.' },
    ],
    avisos: [],
  },
  {
    id: AVANCE.hasta10Abril,
    desde: { anio: 1640, mes: 4, dia: 6 },
    hasta: DIEZ_DE_ABRIL,
    aplicadoEl: '2026-09-08T18:40:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 3583800, despues: 3535800, movimientos: 2 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 42160000, despues: 34000000, movimientos: 5 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 8500000, movimientos: 0 },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Producción del sábado 7 de abril en los cinco edificios activos.' },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'Pagada la soldada de la guarnición y empezada la obra del granero.' },
    ],
    avisos: [],
  },
  {
    id: AVANCE.hasta12Abril,
    desde: DIEZ_DE_ABRIL,
    hasta: PARTIDA.fechaActual,
    aplicadoEl: '2026-09-08T19:45:00.000Z',
    cambios: [
      { tipo: 'saldo', dominioId: DOM.tharan, antes: 4675800, despues: 4651800, movimientos: 2 },
      { tipo: 'saldo', dominioId: DOM.bree, antes: 34000000, despues: 34060000, movimientos: 1 },
      { tipo: 'saldo', dominioId: DOM.archet, antes: 8500000, despues: 8500000, movimientos: 0 },
      {
        tipo: 'almacen',
        dominioId: DOM.bree,
        recursoId: RECURSO.viveres,
        antes: 310 + 2 * viveresAlDia(1240),
        despues: 310,
      },
      {
        tipo: 'almacen',
        dominioId: DOM.bree,
        recursoId: RECURSO.madera,
        antes: 420 + 2 * (1240 * 0.008),
        despues: 420,
      },
      {
        tipo: 'almacen',
        dominioId: DOM.bree,
        recursoId: RECURSO.cerveza,
        antes: 90 + 2 * (1240 * 0.003),
        despues: 90,
      },
      {
        tipo: 'almacen',
        dominioId: DOM.archet,
        recursoId: RECURSO.viveres,
        antes: 900 + 2 * viveresAlDia(310),
        despues: 900,
      },
      { tipo: 'hecho', dominioId: DOM.bree, texto: 'La reparación de la puerta del sur pasa del 42 % al 58 %.' },
      { tipo: 'hecho', dominioId: DOM.archet, texto: 'La obra del molino pasa del 55 % al 60 %.' },
    ],
    avisos: [
      {
        tipo: 'faltaPrevista',
        color: 'ambar',
        dominioId: DOM.bree,
        texto: 'Los víveres de Bree se agotan el 23 de abril',
      },
    ],
    snapshotPrevio: SNAPSHOT_10_ABRIL,
  },
]
```

- [ ] **Paso 5: Escribir el documento completo**

Crea `src/dominio/ejemplo/sombraDelEste.ts` con este contenido:

```ts
import type { CatalogosEnCopia } from '../modelo/catalogos'
import { OPCIONES_INICIALES, RECURSOS_INICIALES } from '../catalogo/inicial'
import type { DocumentoPartida } from '../modelo/documento'
import {
  ANIMALES,
  AJUSTES_EXISTENCIAS,
  ARMERIA_BREE,
  CARAVANAS,
  DEFENSAS,
  EDIFICIOS,
  ENTRADAS_ALMACEN,
  EVENTOS,
  EXISTENCIAS,
  MERCADOS,
  OBRAS,
  POBLACIONES,
  PRODUCCIONES_REALIZADAS,
  RUTAS,
} from './asentamientosAlmacen'
import {
  CAJAS_ASENTAMIENTOS,
  DEUDAS_ASENTAMIENTOS,
  IMPUESTOS_RENTAS,
  LOCALES_COMERCIALES,
  MOVIMIENTOS_ARCHET,
  MOVIMIENTOS_BREE,
  TIPOS_LOCAL,
  TRABAJADORES,
  TRANSFERENCIAS,
  UNIDADES_GUARNICION,
} from './asentamientosDinero'
import { AVANCES } from './avances'
import {
  CAJA_THARAN,
  DEUDAS_THARAN,
  DOMINIOS,
  HECHIZOS,
  INTENTOS,
  INVERSIONES,
  MOVIMIENTOS_THARAN,
  OBJETOS,
  PARTIDA,
  PERGAMINOS,
  PERSONAS,
  RECURRENTES_THARAN,
  UBICACIONES,
  VENTAS,
} from './partidaYPersonaje'

/**
 * «La Sombra del Este» entera, tal como está guardada el 12 de abril de 1640 T.E.: las 34 claves del estado
 * más la lista de avances (decisión 6). Devuelve un objeto nuevo en cada llamada, para que una prueba que
 * toque una colección no ensucie a la siguiente.
 */
export function documentoDeEjemplo(): DocumentoPartida {
  return {
    partida: PARTIDA,
    dominios: [...DOMINIOS],
    cajas: [CAJA_THARAN, ...CAJAS_ASENTAMIENTOS],
    movimientos: [...MOVIMIENTOS_THARAN, ...MOVIMIENTOS_BREE, ...MOVIMIENTOS_ARCHET],
    transferencias: [...TRANSFERENCIAS],
    deudas: [...DEUDAS_THARAN, ...DEUDAS_ASENTAMIENTOS],
    recurrentes: [...RECURRENTES_THARAN],
    objetos: [...OBJETOS],
    ventas: [...VENTAS],
    inversiones: [...INVERSIONES],
    hechizos: [...HECHIZOS],
    intentos: [...INTENTOS],
    pergaminos: [...PERGAMINOS],
    poblaciones: [...POBLACIONES],
    existencias: [...EXISTENCIAS],
    ajustesExistencias: [...AJUSTES_EXISTENCIAS],
    entradasAlmacen: [...ENTRADAS_ALMACEN],
    edificios: [...EDIFICIOS],
    produccionesRealizadas: [...PRODUCCIONES_REALIZADAS],
    trabajadores: [...TRABAJADORES],
    obras: [...OBRAS],
    impuestosRentas: [...IMPUESTOS_RENTAS],
    tiposLocal: [...TIPOS_LOCAL],
    localesComerciales: [...LOCALES_COMERCIALES],
    mercados: [...MERCADOS],
    rutas: [...RUTAS],
    caravanas: [...CARAVANAS],
    unidadesGuarnicion: [...UNIDADES_GUARNICION],
    defensas: [...DEFENSAS],
    animales: [...ANIMALES],
    armeria: [...ARMERIA_BREE],
    eventos: [...EVENTOS],
    ubicaciones: [...UBICACIONES],
    personas: [...PERSONAS],
    avances: [...AVANCES],
  }
}

/** El catálogo de fábrica en la forma en la que viaja en una copia: el ejemplo no usa ninguna opción propia. */
export function catalogosDeEjemplo(): CatalogosEnCopia {
  return { opciones: [...OPCIONES_INICIALES], recursos: [...RECURSOS_INICIALES] }
}
```

- [ ] **Paso 6: Ejecutar las tres pruebas y verlas pasar**

```bash
npx vitest run src/dominio/ejemplo/asentamientosAlmacen.test.ts src/dominio/ejemplo/avances.test.ts src/dominio/ejemplo/sombraDelEste.test.ts
```

Salida esperada (el orden de los archivos, la hora y la duración varían):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas


 Test Files  3 passed (3)
      Tests  13 passed (13)
   Start at  11:31:22
   Duration  902ms (transform 51%, import 40%, tests 7%, worker 2%)
```

- [ ] **Paso 7: Comprobar los tipos y todas las pruebas**

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con 544 pruebas en 47 archivos. La tarea 19 dejó 528 pruebas en 44 archivos, y esta tarea trae **16 nuevas**: 6 de `asentamientosAlmacen.test.ts`, 4 de `avances.test.ts`, 3 de `sombraDelEste.test.ts` y **tres más** en `pureza.test.ts`, que ahora recorre también los tres módulos nuevos del ejemplo.

```text
 Test Files  47 passed (47)
      Tests  544 passed (544)
```

- [ ] **Paso 8: Commit**

```bash
git add src/dominio/ejemplo/asentamientosAlmacen.ts src/dominio/ejemplo/asentamientosAlmacen.test.ts src/dominio/ejemplo/avances.ts src/dominio/ejemplo/avances.test.ts src/dominio/ejemplo/sombraDelEste.ts src/dominio/ejemplo/sombraDelEste.test.ts
git commit -m "feat(ejemplo): almacén, avances y el documento completo de La Sombra del Este" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF` por cada archivo, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/dominio/ejemplo/asentamientosAlmacen.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/asentamientosAlmacen.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/avances.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/avances.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/sombraDelEste.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/dominio/ejemplo/sombraDelEste.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas a3f2c58] feat(ejemplo): almacén, avances y el documento completo de La Sombra del Este
 6 files changed, 1279 insertions(+)
 create mode 100644 src/dominio/ejemplo/asentamientosAlmacen.test.ts
 create mode 100644 src/dominio/ejemplo/asentamientosAlmacen.ts
 create mode 100644 src/dominio/ejemplo/avances.test.ts
 create mode 100644 src/dominio/ejemplo/avances.ts
 create mode 100644 src/dominio/ejemplo/sombraDelEste.test.ts
 create mode 100644 src/dominio/ejemplo/sombraDelEste.ts
```

**Si el paso 6 falla en «no deja ni un problema en las tres validaciones»**, el mensaje trae el detalle completo, con dos líneas por problema. Por ejemplo, si a `personas` le faltara el Gremio:

```text
✖ No existe la persona o entidad «persona.gremio-de-mercaderes-de-bree»
  → en deudas[0].contraparteId
✖ No existe la persona o entidad «persona.gremio-de-mercaderes-de-bree»
  → en avances[3].snapshotPrevio.deudas[0].contraparteId
```

La ruta dice exactamente qué colección y qué índice hay que mirar, y el prefijo `avances[3].snapshotPrevio.` avisa de que el problema está también en el snapshot.

**Avisos que esta tarea deja escritos:**

1. **El molino alquilado no tiene producciones.** §7 dice que «alquilado conserva ocultas sus producciones», pero ninguna vista da las del molino de Bree, así que el ejemplo lo deja con `producciones: []`. Son **seis** producciones repartidas en cinco edificios, y no siete: la séptima fila de la tabla de las vistas es la del molino, que no produce.
2. **Las tres obras terminadas y las seis caravanas del historial no entran.** «Terminadas 3» y «Historial de caravanas 6» son de enero a marzo, fuera del historial corto de la decisión 2, y sus costes obligarían a movimientos anteriores al 15 de marzo. La empalizada, la torre de vigía y el redil existen igual: son la defensa, la defensa y el edificio que aquellas obras habrían creado.
3. **Las existencias no se comprueban contra su historial.** La decisión propia 27 del contrato del modelo lo deja claro: que `Existencia.cantidad` cuadre con entradas, ajustes, producción y consumo es cosa del motor (fase 4). Aquí las cantidades son las de las vistas y la producción ya realizada es la que dejó el motor, sin que nadie ate las dos cosas.
4. **`cambios[]` no es exhaustivo.** Los avances guardan los saldos de los tres dominios, los hechos destacados y —solo en el último— las cuatro filas de almacén que P5 enseña. Reconstruir el almacén de los avances 2 y 3 día a día es trabajo del motor de la fase 4, y nada de la fase 2 lo valida.
5. **La producción de arcilla del 1 de abril es de 2/9 de carretada.** Con la regla mensual empezando el 1 de abril, su primer periodo dura un solo día: 10 × (2/3) ÷ 30. Es pequeña y rara, pero es la consecuencia exacta de la decisión 2, y `EsquemaCantidadRecurso` admite decimales.

---

### Tarea 21 · Pruebas del entregable de la fase

La hoja de ruta pide un entregable concreto para la fase 2: «pruebas del repositorio con `fake-indexeddb`; la partida de ejemplo se guarda, se exporta, se importa y da la bolsa de Tharan (46,518 mo) y la caja de Bree (340,6 mo)». Las veinte tareas anteriores han escrito cada pieza y la han probado por separado; esta las junta en un solo archivo que recorre el camino entero sobre una base de datos real (Dexie sobre una `IDBFactory` falsa): sembrar el catálogo, guardar «La Sombra del Este», listarla como hace P0, exportarla a JSON, volver a leer ese JSON, importarlo en otra tablet y comprobar que las dos cifras del entregable siguen siendo las mismas.

Depende de la tarea 17 (`examinarDestino` e `importarCopia`) y de la tarea 20 (`documentoDeEjemplo()`), y usa además `sembrarCatalogo` (tarea 11), el repositorio (tarea 10), `exportarCopia` (tarea 14), `analizarCopia` (tarea 15), `saldosPorDominio` (tarea 12) y `formatearOro` de la fase 1.

**Esta tarea no escribe código de la app, solo pruebas**, así que no tiene el paso rojo de «la prueba falla porque falta implementar»: todo lo que ejercita ya existe y está en verde. El paso 2 sí comprueba que el archivo no existe todavía (Vitest contesta «No test files found»), y el paso 4 trae una tabla que dice, para cada fallo posible, qué tarea anterior hay que revisar. Si el archivo pasa a la primera, la fase está entregada.

Dos avisos que el contrato pide escribir aquí, porque afectan a lo que estas pruebas demuestran y a lo que no:

- **La cifra de Bree está despejada.** El saldo inicial de la caja de Bree se eligió para que la suma del libro diera 340,6 mo, así que su prueba comprueba la **fórmula** (saldo = inicial + movimientos no programados), no los datos. La de Tharan (46,518 mo) sí está restringida por la bolsa inicial de P1b (4.091.800 mh), y por eso las dos se comprueban juntas.
- **La ida y vuelta normal no ejercita la fusión de catálogos.** El ejemplo no tiene ninguna opción propia del jugador: todos sus `categoriaId`, `oficioId`, `tipoId` y `recursoId` son ids fijos de fábrica, que la tablet de destino ya tiene por id. Por eso hace falta el caso aparte de la categoría «Posadas del camino» (decisión 7 y §6.6, patrón 2), que es el único que hace que `fusionarCatalogos` y `remapearCatalogos` trabajen de verdad.

**Reglas de la especificación que implementa:**

- **Entregable de la fase 2 (hoja de ruta, plan de la fase 1).** «Pruebas del repositorio con `fake-indexeddb`; la partida de ejemplo se guarda, se exporta, se importa y da la bolsa de Tharan (46,518 mo) y la caja de Bree (340,6 mo)». Las dos cifras en mh son 4.651.800 y 34.060.000.
- **Saldo de una caja (§7, línea 1198).** «Saldo = saldo inicial + los movimientos no programados». Es lo que calcula `saldoDeCaja` y lo que las dos cifras comprueban después de pasar por IndexedDB y por JSON.
- **Copia de seguridad (§2, «Restricciones», y §6.1).** «Copia de seguridad exportable e importable (JSON): cada copia es una partida completa». Al importar, «si esa partida ya está en la tablet, la app pregunta si **reemplazar** o **importar como copia**»; desde P0, una copia de una partida que no está se añade sin preguntar.
- **Validación estricta de la copia (§6.1 y decisión 14).** La copia se lee entera antes de escribir nada: forma (Zod), referencias, unicidades y coherencia. Aquí funciona además como red de seguridad del ejemplo: si `documentoDeEjemplo()` tuviera un id que no apunta a nada, `analizarCopia` lo rechazaría y la prueba enseñaría el detalle en castellano.
- **Los catálogos viajan aparte (§6.1, línea 274, y decisión 6).** La copia lleva «{ id, nombre, grupo, plural o unidades, propia }» de las opciones que usan sus registros: **sin** `borrada` ni `protegida`, que son de esta tablet.
- **Fusión de catálogos al importar (decisión 7 y §6.6).** Una opción propia de la copia se une, «en su misma lista y entre las no borradas», a la que tenga el mismo nombre normalizado en esta tablet, y los registros que la usaban pasan a apuntar a la de aquí. La línea del resumen es literal: «La categoría «Posadas del camino» de la copia se ha unido a la tuya con el mismo nombre.»
- **«Última copia exportada» y «última sesión» (decisión 9).** `exportadaEl` y `abiertaEl` viven en la fila de resumen, fuera del estado; exportar **no** cambia `actualizada` ni cuenta como un cambio de la partida.
- **Nada de `BigInt` ni `Date` en el estado (contrato §5, aviso 6).** Los importes son enteros seguros en mh y los instantes son texto ISO 8601, así que el JSON los devuelve idénticos. Los únicos números con decimales del estado son los `sumaFactores` de las producciones y los consumos por habitante: la última prueba comprueba que 10/3 y 22/3 vuelven bit a bit iguales.

**Archivos:**
- Crear: `src/datos/entregable.test.ts`
- Prueba: el archivo que crea **es** la prueba de esta tarea; no hay código de la app que probar

Todos los comandos se escriben en **Git Bash**, desde la raíz del repositorio (`C:/Proyectos/GA/gestion_aldeas`).

- [ ] **Paso 1: Comprobar el punto de partida**

```bash
git status --short
npm test
```

Salida esperada: `git status --short` no escribe nada (la tarea 20 terminó con su commit) y `npm test` termina con las **544 pruebas en 47 archivos** que deja la tarea 20 (la hora y la duración varían):

```text
 Test Files  47 passed (47)
      Tests  544 passed (544)
```

Si el número que ves no es 544, sigue adelante con **el tuyo**: esta tarea añade **un archivo de prueba y 10 pruebas**, así que al terminar tienen que ser «tu número + 10» en «tus archivos + 1». Lo que sí tiene que estar en verde es todo: si alguna prueba falla, arréglala en su tarea antes de empezar esta.

- [ ] **Paso 2: Ver que el archivo todavía no existe**

```bash
npx vitest run src/datos/entregable.test.ts
```

Salida esperada, literal (el orden de las líneas `filter`, `include` y `exclude` puede variar):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

No test files found, exiting with code 1

filter: src/datos/entregable.test.ts
include: src/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**
```

Es la única forma de «rojo» que tiene esta tarea: no añade código de la app, así que sus pruebas nacen en verde. Lo que este paso confirma es la ruta del archivo (`src/datos/`, no `src/dominio/`: toca IndexedDB) y que `include: ['src/**/*.test.ts']` ya lo recogerá sin tocar `vite.config.ts`.

- [ ] **Paso 3: Escribir la prueba del entregable**

Qué comprueba cada bloque:

- **Guardar** (2 pruebas): la partida de ejemplo entra en la base con `crearPartida` y `listarPartidas` la devuelve como la pinta P0 (nombre, fecha en juego, dominios, «última sesión» y `hayAvances`); sus dos cajas dan 46,518 mo y 340,6 mo leídas **desde la base**, no del objeto que quedó en memoria.
- **Exportar** (3 pruebas): el archivo trae su nombre con la fecha del día, el sobre con la marca `gestion-aldeas` y el formato 1; los catálogos de la copia no llevan `borrada` ni `protegida`; exportar anota `exportadaEl` en el resumen y no toca `actualizada` ni `abiertaEl`.
- **Importar** (5 pruebas): la copia se vuelve a leer con `analizarCopia` y se importa en una tablet vacía, donde las dos cifras siguen siendo las mismas; la misma copia importada otra vez como copia deja dos partidas y «Reemplazar» deja una; una categoría del jugador se une a la de esta tablet y el movimiento que la usaba pasa a apuntar a la de aquí; los `sumaFactores` con decimales vuelven iguales.

`baseDePrueba(nombre)` crea una `IDBFactory` nueva en cada llamada, así que las dos bases de estas pruebas (`origen` y `destino`) están aisladas de verdad, y cada `it` empieza con las dos vacías y recién sembradas.

Crea `src/datos/entregable.test.ts` con este contenido:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analizarCopia } from '../dominio/copia/analizar'
import type { SobreCopia } from '../dominio/copia/sobre'
import { formatearOro } from '../dominio/dinero/formato'
import { saldosPorDominio } from '../dominio/dinero/saldo'
import { documentoDeEjemplo } from '../dominio/ejemplo/sombraDelEste'
import type { OpcionCatalogo } from '../dominio/modelo/catalogos'
import type { Id, Instante } from '../dominio/modelo/comunes'
import type { DocumentoPartida } from '../dominio/modelo/documento'
import type { BaseDeDatos } from './baseDeDatos'
import { sembrarCatalogo } from './catalogos'
import { exportarCopia } from './copia/exportar'
import { examinarDestino, importarCopia } from './copia/importar'
import { baseDePrueba } from './pruebas/baseDePrueba'
import { crearPartida, leerPartida, listarPartidas } from './repositorio'

/** Instantes fijos y en orden: ninguna prueba depende del reloj. */
const SESION_ORIGEN: Instante = '2026-09-17T10:00:00.000Z'
const EXPORTACION: Instante = '2026-09-17T11:00:00.000Z'
const SESION_DESTINO: Instante = '2026-09-17T12:00:00.000Z'

/** Ids fijos y legibles de «La Sombra del Este» (decisión 8); los escriben las tareas 18 a 20. */
const PARTIDA = 'p.sombra-del-este'
const THARAN = 'dom.tharan'
const BREE = 'dom.bree'

/** Las dos cifras del entregable de la fase, en mh: «46,518 mo» y «340,6 mo» (hoja de ruta, §7). */
const BOLSA_THARAN = 4651800
const CAJA_BREE = 34060000

/** La categoría del jugador que esta tablet ya tiene, con su id de aquí (§6.6, patrón 2, y J2e). */
const MI_CATEGORIA: OpcionCatalogo = {
  id: 'cat.propia-posadas',
  nombre: 'Posadas del camino',
  lista: 'categorias',
  grupo: 'tuyas',
  propia: true,
  borrada: false,
}

/** El id que esa misma categoría tiene en la tablet que exportó la copia: el que hay que remapear. */
const CATEGORIA_EN_LA_COPIA = 'cat.posadas-del-camino'

let origen: BaseDeDatos
let destino: BaseDeDatos

beforeEach(async () => {
  origen = baseDePrueba('gestion-aldeas-origen')
  destino = baseDePrueba('gestion-aldeas-destino')
  await sembrarCatalogo(origen)
  await sembrarCatalogo(destino)
})

afterEach(() => {
  origen.close()
  destino.close()
})

/** Ids nuevos fijos y en orden: el dominio no toca crypto, recibe la función (contrato §2.8). */
function idsNuevos(): () => Id {
  let n = 0
  return () => {
    n += 1
    return `id-nuevo-${n}`
  }
}

/** Guarda la partida de ejemplo en la tablet de origen, como hace P1 al crearla. */
async function guardarEjemplo(): Promise<DocumentoPartida> {
  const documento = documentoDeEjemplo()
  await crearPartida(origen, documento, SESION_ORIGEN)
  return documento
}

/** Lee una partida guardada y falla con el mensaje del contrato en vez de devolver undefined. */
async function leerGuardada(db: BaseDeDatos, id: Id): Promise<DocumentoPartida> {
  const documento = await leerPartida(db, id)
  if (documento === undefined) {
    throw new Error(`No hay ninguna partida con el id «${id}»`)
  }
  return documento
}

/** Analiza el texto de una copia y, si se rechaza, falla enseñando el motivo y el detalle en castellano. */
function copiaValida(texto: string): SobreCopia {
  const resultado = analizarCopia(texto)
  if (!resultado.ok) {
    throw new Error(`${resultado.mensaje}\n${resultado.detalle ?? ''}`)
  }
  expect(resultado.migrada).toBe(false)
  expect(resultado.desdeVersion).toBe(1)
  return resultado.copia
}

/** Guarda, exporta y valida: el punto de partida de todas las pruebas de importación. */
async function copiaDelEjemplo(): Promise<SobreCopia> {
  await guardarEjemplo()
  const archivo = await exportarCopia(origen, PARTIDA, EXPORTACION)
  return copiaValida(archivo.texto)
}

/** La copia, con una categoría del jugador y el primer movimiento apuntando a ella: eso ejercita la fusión. */
function conCategoriaPropia(copia: SobreCopia): SobreCopia {
  const sobre = structuredClone(copia)
  sobre.catalogos.opciones.push({
    id: CATEGORIA_EN_LA_COPIA,
    nombre: 'Posadas del camino',
    lista: 'categorias',
    grupo: 'tuyas',
    propia: true,
  })
  sobre.partida.movimientos[0].categoriaId = CATEGORIA_EN_LA_COPIA
  return sobre
}

describe('guardar la partida de ejemplo', () => {
  it('P0 la lista con su nombre, su fecha en juego, sus dominios y su última sesión', async () => {
    await guardarEjemplo()

    const filas = await listarPartidas(origen)
    expect(filas).toHaveLength(1)
    expect(filas[0].id).toBe(PARTIDA)
    expect(filas[0].nombre).toBe('La Sombra del Este')
    expect(filas[0].edad).toBe('tercera')
    expect(filas[0].fechaInicial).toEqual({ anio: 1640, mes: 1, dia: 1 })
    expect(filas[0].fechaActual).toEqual({ anio: 1640, mes: 4, dia: 12 })
    // El personaje va primero y después los asentamientos (contrato del modelo §2.12).
    expect(filas[0].dominios[0]).toBe('Tharan')
    expect([...filas[0].dominios].sort()).toEqual(['Archet', 'Bree', 'Tharan'])
    expect(filas[0].hayAvances).toBe(true)
    expect(filas[0].abiertaEl).toBe(SESION_ORIGEN)
    expect(filas[0].exportadaEl).toBeUndefined()
  })

  it('la bolsa de Tharan son 46,518 mo y la caja de Bree, 340,6 mo', async () => {
    await guardarEjemplo()

    const documento = await leerGuardada(origen, PARTIDA)
    const saldos = saldosPorDominio(documento)
    expect(saldos[THARAN]).toBe(BOLSA_THARAN)
    expect(saldos[BREE]).toBe(CAJA_BREE)
    expect(formatearOro(saldos[THARAN], documento.partida.equivalencias)).toBe('46,518 mo')
    expect(formatearOro(saldos[BREE], documento.partida.equivalencias)).toBe('340,6 mo')
  })
})

describe('exportar la copia', () => {
  it('el archivo lleva el nombre del día y un sobre con la marca de la app', async () => {
    await guardarEjemplo()

    const archivo = await exportarCopia(origen, PARTIDA, EXPORTACION)
    expect(archivo.nombre).toBe('gestion-aldeas-la-sombra-del-este-2026-09-17.json')
    expect(archivo.sobre.app).toBe('gestion-aldeas')
    expect(archivo.sobre.versionFormato).toBe(1)
    expect(archivo.sobre.exportadaEl).toBe(EXPORTACION)
    expect(archivo.sobre.partida.partida.id).toBe(PARTIDA)
    expect(archivo.texto).toBe(JSON.stringify(JSON.parse(archivo.texto)))
  })

  it('los catálogos de la copia no llevan lo que es de esta tablet', async () => {
    await guardarEjemplo()

    const archivo = await exportarCopia(origen, PARTIDA, EXPORTACION)
    const catalogos = archivo.sobre.catalogos
    expect(catalogos.opciones.length).toBeGreaterThan(0)
    expect(catalogos.recursos.length).toBeGreaterThan(0)
    for (const opcion of catalogos.opciones) {
      expect(opcion).not.toHaveProperty('borrada')
      expect(opcion).not.toHaveProperty('protegida')
      expect(opcion.propia).toBe(false)
    }
    for (const recurso of catalogos.recursos) {
      expect(recurso).not.toHaveProperty('borrada')
      expect(recurso).not.toHaveProperty('protegido')
    }
  })

  it('exportar anota «Última copia exportada» y no cuenta como un cambio de la partida', async () => {
    await guardarEjemplo()
    const antes = (await listarPartidas(origen))[0]

    await exportarCopia(origen, PARTIDA, EXPORTACION)

    const despues = (await listarPartidas(origen))[0]
    expect(despues.exportadaEl).toBe(EXPORTACION)
    expect(despues.actualizada).toBe(antes.actualizada)
    expect(despues.abiertaEl).toBe(antes.abiertaEl)
    const documento = await leerGuardada(origen, PARTIDA)
    expect(documento.partida.actualizada).toBe(antes.actualizada)
    expect(documento.partida.cambiosDesdeUltimoAvance).toBe(0)
  })
})

describe('importar la copia', () => {
  it('en una tablet vacía se añade sin preguntar y da las mismas cifras', async () => {
    const ejemplo = documentoDeEjemplo()
    const copia = await copiaDelEjemplo()

    const destinoPosible = await examinarDestino(destino, copia, 'selector')
    expect(destinoPosible).toEqual({ yaExiste: false, modos: ['nueva'] })

    const resumen = await importarCopia(destino, copia, {
      modo: 'nueva',
      ahora: SESION_DESTINO,
      nuevoId: idsNuevos(),
    })
    expect(resumen.partidaId).toBe(PARTIDA)
    expect(resumen.nombre).toBe('La Sombra del Este')
    expect(resumen.migrada).toBe(false)
    expect(resumen.lineas[0]).toBe('Se ha añadido la partida «La Sombra del Este».')

    const documento = await leerGuardada(destino, PARTIDA)
    const saldos = saldosPorDominio(documento)
    expect(formatearOro(saldos[THARAN], documento.partida.equivalencias)).toBe('46,518 mo')
    expect(formatearOro(saldos[BREE], documento.partida.equivalencias)).toBe('340,6 mo')
    expect(documento.movimientos).toHaveLength(ejemplo.movimientos.length)
    expect(documento.avances).toHaveLength(ejemplo.avances.length)
    expect(documento.avances[documento.avances.length - 1].snapshotPrevio).toBeDefined()
  })

  it('la misma copia importada otra vez como copia deja dos partidas con nombres distintos', async () => {
    const copia = await copiaDelEjemplo()
    const nuevoId = idsNuevos()
    await importarCopia(destino, copia, { modo: 'nueva', ahora: SESION_DESTINO, nuevoId })

    const destinoPosible = await examinarDestino(destino, copia, 'selector')
    expect(destinoPosible.yaExiste).toBe(true)
    expect(destinoPosible.nombreExistente).toBe('La Sombra del Este')
    expect(destinoPosible.modos).toEqual(['reemplazar', 'comoCopia'])

    const resumen = await importarCopia(destino, copia, { modo: 'comoCopia', ahora: SESION_DESTINO, nuevoId })
    expect(resumen.partidaId).not.toBe(PARTIDA)
    expect(resumen.nombre).toBe('La Sombra del Este (copia)')
    expect(resumen.lineas[0]).toBe('Se ha importado como copia: «La Sombra del Este (copia)».')

    const filas = await listarPartidas(destino)
    expect(filas).toHaveLength(2)
    expect(filas.map((fila) => fila.nombre).sort()).toEqual(['La Sombra del Este', 'La Sombra del Este (copia)'])
    const copiada = await leerGuardada(destino, resumen.partidaId)
    expect(copiada.partida.nombre).toBe('La Sombra del Este (copia)')
    expect(saldosPorDominio(copiada)[THARAN]).toBe(BOLSA_THARAN)
  })

  it('«Reemplazar» deja una sola partida y conserva las cifras', async () => {
    const copia = await copiaDelEjemplo()
    const nuevoId = idsNuevos()
    await importarCopia(destino, copia, { modo: 'nueva', ahora: SESION_DESTINO, nuevoId })

    const resumen = await importarCopia(destino, copia, { modo: 'reemplazar', ahora: SESION_DESTINO, nuevoId })
    expect(resumen.partidaId).toBe(PARTIDA)
    expect(resumen.lineas[0]).toBe('Se ha reemplazado la partida «La Sombra del Este».')

    const filas = await listarPartidas(destino)
    expect(filas).toHaveLength(1)
    const documento = await leerGuardada(destino, PARTIDA)
    expect(saldosPorDominio(documento)[BREE]).toBe(CAJA_BREE)
  })

  it('una categoría tuya de la copia se une a la de esta tablet y su movimiento la sigue', async () => {
    await destino.opcionesCatalogo.add(MI_CATEGORIA)
    const copia = conCategoriaPropia(await copiaDelEjemplo())
    const movimientoId = copia.partida.movimientos[0].id

    const resumen = await importarCopia(destino, copiaValida(JSON.stringify(copia)), {
      modo: 'nueva',
      ahora: SESION_DESTINO,
      nuevoId: idsNuevos(),
    })

    expect(resumen.fusion.unidasPorNombre).toEqual([
      { idEnLaCopia: CATEGORIA_EN_LA_COPIA, id: MI_CATEGORIA.id, lista: 'categorias', nombre: 'Posadas del camino' },
    ])
    expect(resumen.fusion.creadas).toEqual([])
    expect(resumen.lineas).toContain(
      'La categoría «Posadas del camino» de la copia se ha unido a la tuya con el mismo nombre.',
    )
    // El catálogo no crece: las 145 de fábrica y la del jugador, que ya estaba.
    expect(await destino.opcionesCatalogo.count()).toBe(146)

    const documento = await leerGuardada(destino, PARTIDA)
    const movimiento = documento.movimientos.find((m) => m.id === movimientoId)
    expect(movimiento?.categoriaId).toBe(MI_CATEGORIA.id)
  })

  it('los sumaFactores no enteros (10/3 y 22/3) vuelven iguales tras pasar por JSON', async () => {
    const copia = await copiaDelEjemplo()
    await importarCopia(destino, copia, { modo: 'nueva', ahora: SESION_DESTINO, nuevoId: idsNuevos() })

    const documento = await leerGuardada(destino, PARTIDA)
    const conDecimales = documento.edificios
      .flatMap((edificio) => edificio.producciones)
      .map((produccion) => produccion.acumulado.sumaFactores)
      .filter((suma) => !Number.isInteger(suma))
      .sort((a, b) => a - b)
    expect(conDecimales).toEqual([10 / 3, 22 / 3])
    expect(conDecimales[0]).toBe(3.3333333333333335)
    expect(conDecimales[1]).toBe(7.333333333333333)
  })
})
```

Tres detalles del archivo que conviene no cambiar al copiarlo:

- `expect(archivo.texto).toBe(JSON.stringify(JSON.parse(archivo.texto)))` comprueba que el texto exportado es JSON compacto y que volver a serializarlo no reordena nada: es la forma barata de ver que `serializarCopia` no mete espacios ni pierde claves. Que dos exportaciones del mismo estado den el mismo texto ya lo prueba la tarea 14.
- `expect(destinoPosible).toEqual({ yaExiste: false, modos: ['nueva'] })` pasa aunque `DestinoImportacion` traiga `nombreExistente` y `rechazo` valiendo `undefined`: `toEqual` no distingue una clave ausente de una clave con `undefined`. Por eso aquí se usa `toEqual` y no `toStrictEqual`, como en todas las pruebas que comparan lo leído de IndexedDB.
- El mismo `nuevoId` se reutiliza en las dos importaciones de una prueba, porque devuelve un id distinto cada vez que se le llama; lo que **no** se comprueba es cuál sale (`id-nuevo-1` o el siguiente), porque la fusión puede gastar alguno antes de que le toque al nombre de la copia.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

```bash
npx vitest run src/datos/entregable.test.ts
```

Salida esperada (la hora y la duración varían; estas pruebas siembran dos catálogos en cada `it`, así que tardan algo más que las demás):

```text
 RUN  v5.0.1 C:/Proyectos/GA/gestion_aldeas

 ✓ src/datos/entregable.test.ts (10 tests) 1284ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

Si algo falla, esta tabla dice a qué tarea volver. Ninguno de estos fallos se arregla tocando `entregable.test.ts`: la prueba es la que tiene razón, porque copia las cifras y los textos del contrato.

| Lo que falla | Qué revisar |
|---|---|
| `crearPartida` lanza «Ya hay una partida con el id «p.sombra-del-este»» | la base no se está creando vacía en cada prueba: `baseDePrueba()` tiene que inyectar una `IDBFactory` nueva (tarea 9) |
| `copiaValida` lanza «La copia está dañada: …» con su detalle | el ejemplo (tareas 18 a 20) o los validadores (tarea 13). El detalle dice la ruta exacta: «✖ No existe la categoría «…»» y «  → en movimientos[3].categoriaId» |
| `copiaValida` lanza «Este archivo no es una copia de Gestión de Aldeas» | `armarCopia` o `serializarCopia` (tarea 14): el sobre no lleva `app` o `versionFormato` |
| Las cifras no dan 46,518 mo o 340,6 mo | el libro del ejemplo (tareas 18 y 19) o `saldoDeCaja` (tarea 12). Compara primero los mh: 4.651.800 y 34.060.000 |
| `dominios[0]` no es «Tharan» | `resumenDePartida` (tarea 6): el personaje va primero |
| `exportadaEl` no se anota, o `actualizada` cambia | `exportarCopia` (tarea 14) y la decisión 9 |
| `modos` no es `['reemplazar', 'comoCopia']` | `examinarDestino` (tarea 17) |
| `unidasPorNombre` sale vacío, o hay una opción creada de más | `fusionarCatalogos` (tarea 16) o `normalizarNombre` (tarea 7) |
| El movimiento conserva `cat.posadas-del-camino` | `remapearCatalogos` (tarea 16), que tiene que recorrer los 20 campos de catálogo, o el orden de `importarCopia` (tarea 17) |
| Los `sumaFactores` no vuelven iguales | `serializarCopia` (tarea 14): las cantidades no se pueden redondear ni pasar por `toFixed` |

- [ ] **Paso 5: Comprobar los tipos y todas las pruebas**

`npx tsc -b` es aquí lo que detecta que `DocumentoPartida` ha dejado de encajar con `EstadoPartida` en `saldosPorDominio`, o que `OpcionEnCopia` ya no admite la variante `categorias`; `vitest run` no comprueba tipos.

```bash
npx tsc -b
npm test
```

Salida esperada: `npx tsc -b` no escribe nada y `npm test` termina con **554 pruebas en 48 archivos**. La tarea 20 dejó 544 en 47, y esta trae **10 nuevas**: las de `entregable.test.ts`. `pureza.test.ts` no crece, porque el archivo nuevo es de `src/datos` y no del dominio. Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with `fsModuleCache: true`»), que no es un fallo:

```text
 Test Files  48 passed (48)
      Tests  554 passed (554)
```

Con esto están los 48 archivos de prueba de la fase: los 8 de la fase 1 y los 40 nuevos. La tarea 22 los cuenta uno a uno.

- [ ] **Paso 6: Commit**

```bash
git add src/datos/entregable.test.ts
git commit -m "test(datos): la partida de ejemplo se guarda, se exporta, se importa y da sus cifras" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git status --short
```

Salida esperada (el identificador del commit varía). Con `core.autocrlf=true`, lo normal en Git para Windows, `git add` avisa `LF will be replaced by CRLF`, y es inofensivo. `git status --short` no muestra nada:

```text
warning: in the working copy of 'src/datos/entregable.test.ts', LF will be replaced by CRLF the next time Git touches it
[diseno/especificacion-y-vistas 4c19af2] test(datos): la partida de ejemplo se guarda, se exporta, se importa y da sus cifras
 1 file changed, 299 insertions(+)
 create mode 100644 src/datos/entregable.test.ts
```

---

### Tarea 22 · Cierre de la fase

Comprueba el entregable de la fase 2: todo el modelo, la base de datos, el repositorio, la copia y la partida de ejemplo en verde, la app compilando sin errores, el linter sin avisos y cada tarea confirmada en Git. **No escribe código ni hace ningún commit**: solo ejecuta comprobaciones y, si alguna falla, dice a qué tarea volver.

Depende de la tarea 21, que es la última que escribe algo.

**Reglas de la especificación que implementa:**

- **Entregable de la fase 2 (hoja de ruta, plan de la fase 1).** «Pruebas del repositorio con `fake-indexeddb`; la partida de ejemplo se guarda, se exporta, se importa y da la bolsa de Tharan (46,518 mo) y la caja de Bree (340,6 mo)». El paso 6 recorre esa lista punto por punto, con el archivo de prueba que respalda cada uno.
- **Alcance de la fase 2 (hoja de ruta).** «Tipos del estado completo de una partida (§8); IndexedDB con Dexie: un documento por partida y catálogos de la app aparte (§6.5); repositorio: listar, crear, abrir, guardar y borrar partidas; datos de ejemplo «La Sombra del Este» construidos con todas las cifras de las vistas; copia JSON con `versionFormato` (§6.1): validación, rechazo de versiones más nuevas, «Reemplazar» o «Importar como copia»; saldo de una caja = inicial + movimientos no programados (§7)».
- **Cada fase deja software que funciona (hoja de ruta).** Por eso se comprueban las cuatro órdenes juntas: `npm test`, `npx tsc -b`, `npm run build` y `npm run lint`. La fase 1 ya cerró así.

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


 Test Files  48 passed (48)
      Tests  554 passed (554)
```

Vitest 5 puede añadir al final un aviso de rendimiento («persist transforms across runs with `fsModuleCache: true`»). **No es un fallo** y no hay que hacer nada: lo que cuenta es que no haya ni un `failed`.

Las 554 pruebas se reparten así (con `npx vitest run --reporter=verbose` sale una línea `✓` por prueba y una línea por archivo con su recuento):

| Archivo de prueba | Tarea | Pruebas |
|---|---|---|
| `src/dominio/humo.test.ts` | fase 1 | 3 |
| `src/dominio/dinero/monedas.test.ts` | fase 1 | 14 |
| `src/dominio/dinero/importe.test.ts` | fase 1 | 34 |
| `src/dominio/dinero/formato.test.ts` | fase 1 | 22 |
| `src/dominio/calendario/fecha.test.ts` | fase 1 | 59 |
| `src/dominio/calendario/formatoFecha.test.ts` | fase 1 | 19 |
| `src/dominio/calendario/recurrencia.test.ts` | fase 1 | 68 |
| `src/dominio/dinero/prorrateo.test.ts` | fase 1 | 12 |
| **Subtotal de la fase 1** | | **231** |
| `src/dominio/pureza.test.ts` | 1 | 40 |
| `src/datos/humo.test.ts` | 1 (reescrita en la 9) | 3 |
| `src/dominio/modelo/comunes.test.ts` | 2 | 17 |
| `src/dominio/modelo/partida.test.ts` | 3 | 3 |
| `src/dominio/modelo/dominios.test.ts` | 3 | 3 |
| `src/dominio/modelo/movimientos.test.ts` | 3 | 7 |
| `src/dominio/modelo/deudas.test.ts` | 3 | 3 |
| `src/dominio/modelo/personaje.test.ts` | 4 | 15 |
| `src/dominio/modelo/almacen.test.ts` | 5 | 7 |
| `src/dominio/modelo/asentamiento.test.ts` | 5 | 9 |
| `src/dominio/modelo/comercio.test.ts` | 5 | 5 |
| `src/dominio/modelo/catalogos.test.ts` | 6 | 4 |
| `src/dominio/modelo/eventos.test.ts` | 6 | 2 |
| `src/dominio/modelo/avance.test.ts` | 6 | 2 |
| `src/dominio/modelo/documento.test.ts` | 6 | 3 |
| `src/dominio/modelo/resumen.test.ts` | 6 | 2 |
| `src/dominio/texto/normalizar.test.ts` | 7 | 11 |
| `src/dominio/catalogo/inicial.test.ts` | 8 | 15 |
| `src/datos/baseDeDatos.test.ts` | 9 | 5 |
| `src/datos/ids.test.ts` | 9 | 3 |
| `src/datos/repositorio.test.ts` | 10 | 12 |
| `src/datos/ajustes.test.ts` | 10 | 5 |
| `src/datos/catalogos.test.ts` | 11 | 10 |
| `src/dominio/dinero/saldo.test.ts` | 12 | 13 |
| `src/dominio/validacion/referencias.test.ts` | 13 | 9 |
| `src/dominio/validacion/unicidades.test.ts` | 13 | 8 |
| `src/dominio/validacion/coherencia.test.ts` | 13 | 8 |
| `src/dominio/copia/sobre.test.ts` | 14 | 7 |
| `src/datos/copia/exportar.test.ts` | 14 | 4 |
| `src/dominio/copia/analizar.test.ts` | 15 | 7 |
| `src/dominio/copia/migraciones.test.ts` | 15 | 3 |
| `src/dominio/copia/comoCopia.test.ts` | 15 | 3 |
| `src/dominio/copia/fusion.test.ts` | 16 | 15 |
| `src/datos/copia/importar.test.ts` | 17 | 14 |
| `src/dominio/ejemplo/partidaYPersonaje.test.ts` | 18 | 12 |
| `src/dominio/ejemplo/asentamientosDinero.test.ts` | 19 | 11 |
| `src/dominio/ejemplo/asentamientosAlmacen.test.ts` | 20 | 6 |
| `src/dominio/ejemplo/avances.test.ts` | 20 | 4 |
| `src/dominio/ejemplo/sombraDelEste.test.ts` | 20 | 3 |
| `src/datos/entregable.test.ts` | 21 | 10 |
| **Subtotal de la fase 2** | | **323** |
| **Total** | | **554** |

Tres cosas que hay que saber leer en esta tabla:

- **`pureza.test.ts` vale por 40 pruebas, no por las 9 con las que nació.** Es un `it.each` sobre los módulos del dominio: dos pruebas fijas más una por módulo. Al cerrar la fase, `src/dominio` tiene **38 módulos** (7 de la fase 1, 14 del modelo, `normalizar`, `inicial`, `saldo`, los 3 de `validacion/`, los 5 de `copia/` y los 6 de `ejemplo/`), así que son 2 + 38 = 40. Ese crecimiento ya está repartido tarea a tarea: cada una contó sus pruebas propias **más** una por cada módulo nuevo del dominio. Por eso el total es 554 y no los «≈ 570» que estimaba `contrato-datos.md` §4, que contaba ese crecimiento dos veces.
- **Lo que manda es lo que imprime Vitest.** Si una tarea acabó con una o dos pruebas más o menos de las que aquí figuran, el archivo de esa tarea es el que tiene razón: comprueba entonces que el total sigue cuadrando con la suma de la columna y que los **48 archivos** están todos. Lo que no puede pasar es que falte un archivo de la tabla, porque eso significa que una tarea se dejó a medias.
- **No hay ningún archivo de prueba fuera de `src/`.** `include` sigue siendo `['src/**/*.test.ts']` y no se ha tocado `vite.config.ts` en toda la fase.

- [ ] **Paso 2: Comprobar los tipos de todo el proyecto**

`vitest run` no comprueba tipos: los esquemas Zod y los tipos inferidos con `z.infer` solo se atan con el compilador.

```bash
npx tsc -b
```

Salida esperada: **ninguna línea**. Si escribe algo, es un error de tipos y hay que arreglarlo en la tarea que escribió el archivo que nombra.

- [ ] **Paso 3: Compilar la app**

`npm run build` comprueba antes los tipos de todo `src/` con `tsc -b`, también los de las pruebas, y después empaqueta la app.

```bash
npm run build
```

Salida esperada (el tiempo y el nombre del `.js` varían). Siguen siendo **15 módulos**, los mismos que en la fase 1: la app todavía no importa ni `src/dominio` ni `src/datos`, y las pantallas empiezan en la fase 6. Que Dexie y Zod estén instalados no engorda el `dist`, porque nadie los importa desde `main.tsx` todavía:

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

Cada tarea de la fase 2 termina con su commit, así que el árbol debe estar limpio y el historial debe tener **21 commits** de esta fase (las tareas 1 a 21; esta no hace ninguno).

```bash
git status --short
git log --oneline -21
```

Salida esperada: `git status --short` no escribe nada (`dist/` y `node_modules/` están en `.gitignore`), y `git log` muestra los 21 commits de la fase, del más reciente al más antiguo, con el mensaje que escribió cada tarea (los identificadores varían):

```text
4c19af2 test(datos): la partida de ejemplo se guarda, se exporta, se importa y da sus cifras
a3f2c58 feat(ejemplo): almacén, avances y el documento completo de La Sombra del Este
7b04d19 feat(ejemplo): el dinero de Bree y de Archet, con sus locales y su guarnición
6e1a0c3 feat(ejemplo): la partida La Sombra del Este y el personaje Tharan
1d8b5f7 feat(datos): importar una copia, con reemplazar e importar como copia
0a7c4e2 feat(copia): fusión de catálogos, remapeo de los registros y resumen de la fusión
c9e3b18 feat(copia): análisis de una copia, cadena de migraciones e importar como copia
82f6d45 feat(copia): sobre de la copia, catálogos que viajan y exportación de una partida
5b71e93 feat(validacion): referencias, unicidades y coherencia de una copia
3a0c7d6 feat(dinero): saldo de una caja, saldos por dominio y bolsa inicial de P1b
e47f291 feat(datos): sembrar el catálogo de fábrica sin pisar lo del jugador, y leerlo
b0d8a53 feat(datos): listar, crear, abrir, guardar y borrar partidas, y los ajustes de la app
9f31ba2 feat(datos): la base de Dexie con sus cinco tablas, el ayudante de las pruebas y los ids nuevos
7c25e08 feat(catalogo): las 145 opciones y los 21 recursos de fábrica con sus ids fijos
2c3d4e5 feat(texto): comparar nombres sin mayúsculas, tildes ni espacios dobles, con la ñ aparte
d61b9a4 feat(modelo): catálogos, eventos, avances, documento de partida y resumen de P0
4e8f0c7 feat(modelo): esquemas de almacén, asentamiento y comercio
a72d3b1 feat(modelo): esquemas del personaje: inventario, ventas, inversiones, hechizos y pergaminos
f19c6e8 feat(modelo): esquemas de partida, dominios, movimientos y deudas
8b3a7d0 feat(modelo): tipos de apoyo y esquemas Zod de los valores de la fase 1
15e9c24 chore: instalar Dexie, Zod y fake-indexeddb y probar que el dominio sigue siendo puro
```

Lo que se comprueba aquí es que hay **un commit por tarea y ninguno de más**, y que el árbol está limpio. Si `git status --short` lista algún archivo, es que se saltó el último paso de la tarea que lo crea: la tabla del paso 1 dice qué tarea escribe cada archivo de prueba, y cada archivo de código va con su prueba en el mismo commit. Vuelve a esa tarea, ejecuta su `git add` y su `git commit` tal como están escritos, y repite este paso.

- [ ] **Paso 6: Recorrer la lista de comprobación del entregable**

Esto es lo que la hoja de ruta pide de la fase 2. Cada punto se puede comprobar solo, con el comando de su fila; todos juntos son el `npm test` del paso 1.

- [ ] **Tipos del estado completo de una partida (§8).** Las 37 entidades tienen su esquema Zod y `EsquemaDocumentoPartida` tiene 34 claves (`partida` y 33 colecciones), `avances` incluida.

  ```bash
  npx vitest run src/dominio/modelo
  ```

- [ ] **IndexedDB con Dexie: un documento por partida y los catálogos aparte (§6.5).** La base abre con `verno === 1` y sus cinco tablas: `partidas` (clave `partida.id`), `resumenes`, `opcionesCatalogo`, `recursosCatalogo` y `ajustes`.

  ```bash
  npx vitest run src/datos/baseDeDatos.test.ts src/datos/humo.test.ts
  ```

- [ ] **Repositorio: listar, crear, abrir, guardar y borrar partidas.** Con los ajustes de la app y la regla de la decisión 9: abrir cambia `abiertaEl` y no `actualizada`.

  ```bash
  npx vitest run src/datos/repositorio.test.ts src/datos/ajustes.test.ts
  ```

- [ ] **Datos de ejemplo «La Sombra del Este» con las cifras de las vistas.** Bolsa 46,518 mo, caja de Bree 340,6 mo, caja de Archet 85 mo, 1.240 habitantes, 890 sacos de víveres libres, 178 animales y los cuatro avances, con `snapshotPrevio` solo en el último.

  ```bash
  npx vitest run src/dominio/ejemplo
  ```

- [ ] **Copia JSON con `versionFormato` (§6.1): validación, rechazo de versiones más nuevas y los tres modos.** Los cuatro mensajes literales: «Este archivo no es una copia de Gestión de Aldeas», «Esta copia es de una versión más nueva de la app», «La copia está dañada: \<detalle\>» y «Esta copia es de otra partida».

  ```bash
  npx vitest run src/dominio/copia src/dominio/validacion src/datos/copia
  ```

- [ ] **Saldo de una caja = inicial + movimientos no programados (§7).**

  ```bash
  npx vitest run src/dominio/dinero/saldo.test.ts
  ```

- [ ] **El entregable entero, sobre `fake-indexeddb`.** Guardar, listar, exportar, importar, «Reemplazar», «Importar como copia», la fusión de catálogos y las dos cifras.

  ```bash
  npx vitest run src/datos/entregable.test.ts
  ```

- [ ] **El dominio sigue siendo puro.** Ni Dexie, ni React, ni `fake-indexeddb`, ni `indexedDB`, `localStorage`, `window`, `document`, `navigator` o `crypto` en los 38 módulos de `src/dominio`. Zod sí (decisión 15).

  ```bash
  npx vitest run src/dominio/pureza.test.ts
  ```

- [ ] **La configuración no se ha tocado.** `vite.config.ts`, los tres `tsconfig*.json` y `.oxlintrc.json` están igual que al acabar la fase 1; lo único que cambió son las tres dependencias nuevas.

  ```bash
  git diff --stat HEAD~21 -- vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json .oxlintrc.json
  git diff HEAD~21 -- package.json
  ```

  `HEAD~21` es el commit con el que empezó la fase 2, es decir, el último de la fase 1: la fase 2 tiene exactamente 21 commits (paso 5). El primer comando no escribe nada; el segundo enseña solo las tres dependencias nuevas, `dexie`, `zod` y `fake-indexeddb`.

Con la lista entera marcada, **la fase 2 está cerrada**: no hace falta ningún commit más. Lo siguiente es escribir el plan de la fase 3 («Motor I: dinero») en `docs/superpowers/plans/`, como dice la hoja de ruta.

---

## Lo que queda para las fases siguientes

La fase 2 deja el estado guardado, copiado y validado, pero **no calcula nada** más allá del saldo. Esto es lo que queda apuntado, con lo que la fase 2 ya ha dejado hecho para que quien lo recoja no empiece de cero:

1. **El motor `simular(estado, dias)` (fases 3 a 5).** El modelo, los ids fijos del catálogo (`CATEGORIA.salarios`, `RECURSO.viveres`) y la partida de ejemplo son valores puros pensados para las pruebas del motor: se importan desde `src/dominio` sin tocar IndexedDB. Los campos que solo el motor rellena (`Movimiento.avanceId`, `ProduccionRealizada`, `Avance.cambios[]` y `avisos[]`) ya están en el formato 1, así que el motor no tendrá que cambiar la forma del documento ni subir `VERSION_FORMATO`.
2. **Lo que la validación no comprueba a propósito.** Que `Deuda.estado` cuadre con lo pendiente, que `Edificio.producciones[].acumulado` cuadre con los días transcurridos, que `Existencia.cantidad` cuadre con entradas, ajustes, producción y consumo, y que el saldo de una caja sea el que muestran las vistas. Son cálculos del motor: cuando existan, la fase 3 o la 4 pueden decidir si añadirlos a `validarCoherenciaInterna` o dejarlos como pruebas del motor.
3. **El historial del ejemplo es corto (decisión 2).** Empieza el 31 de marzo de 1640, así que los recuentos de P7 quedan por debajo de los de las vistas («Salarios · 12 movimientos») y el evento de bandidos de marzo se queda sin regla a la que afectar. La fase 9 alargará el historial; hasta entonces, ninguna prueba debe apoyarse en esos recuentos.
4. **La interfaz de la copia (fases 6 y 9).** `analizarCopia` y `importarCopia` devuelven ya los textos en castellano que hay que pintar: los cuatro mensajes de rechazo, el detalle plegado de `detalleDeProblemas` y las líneas de `lineasDeFusion`. Falta el diálogo de P0 que pregunta «Reemplazar» o «Importar como copia», el rechazo de P6 y el `<input type="file">` y la descarga del archivo, que son lo único que no se puede probar sin navegador.
5. **P7 «Listas y catálogos» y P7b «eliminar con reasignación» (fase 9).** Están hechos `sembrarCatalogo`, `leerOpciones`, `leerRecursos`, `leerCatalogo` y `escribirCatalogo`, con `CambiosCatalogo` como forma de las altas y reactivaciones. Falta la pantalla y la reasignación de una opción **en todas las partidas**, que es la razón de que las cinco tablas vivan en una sola base: una transacción de IndexedDB no abarca dos bases.
6. **Los «Recientes» de los selectores (fase 9).** La tabla `ajustes` ya existe y hoy solo guarda `versionCatalogo`; `AjustesApp` es el sitio donde crecerá, y `leerAjuste`/`guardarAjuste` están tipados por clave para que crecer no rompa nada.
7. **Las migraciones de formato.** `MIGRACIONES` está vacía porque el formato 1 es el primero, pero la cadena está probada con una migración de mentira (tarea 15) y recorre también `avances[].snapshotPrevio`. Cuando llegue el formato 2: se escribe `MIGRACIONES[1]`, se sube `VERSION_FORMATO` y las copias antiguas siguen entrando.
8. **`RecurrenteDinero.unidadDiaria` sigue sin decidir**: es el único campo del modelo que no respalda ninguna decisión del usuario, y conviene preguntárselo antes de la fase 3. Hoy es un campo opcional de 1 a 20 caracteres, porque §9 agrupa «Posada · 7 noches» y nada dice de dónde sale «noches». Si el usuario decide que los conceptos diarios digan siempre «días», se borra el campo del esquema y de la partida de ejemplo; es un cambio de una línea en `movimientos.ts` mientras no haya partidas reales guardadas.
9. **El tamaño de la copia (aviso 5 del contrato).** El `snapshotPrevio` dobla el documento: con 5.000 movimientos el JSON ronda los 2,5 MB y validarlo cuesta unos 9 ms. Es asumible para una partida de mesa, pero si una partida larga diera guerra en la tablet, la salida sería guardar el snapshot comprimido o dejar de guardarlo y recalcular el deshacer, y eso cambia el formato.
10. **La lista de campos de catálogo está escrita tres veces** (`catalogosUsados`, `remapearCatalogos` y la tabla de referencias de `contrato-modelo.md` §4.1), 20 campos cada una. Quien añada un `recursoId` o un `categoriaId` nuevo al modelo en cualquier fase tiene que tocar las tres; la prueba de la tarea 16 lo detecta.
