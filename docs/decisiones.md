# Decisiones de «Gestión de Aldeas»

Aquí está, en una línea cada una, todo lo que Claude ha decidido por su cuenta mientras construía la app, más lo que decidiste tú. Sirve para revisarlo sin tener que leer nada de código.

**¿No te convence alguna?** Dile a Claude «cambia la D-007» y él la sustituye y arrastra el cambio al código, a la especificación y a los planes. Los números no cambian nunca, así que puedes citarlos.

## Fase 1 · Dinero y calendario (2026-09-17)

| # | Decisión | Por qué |
|---|---|---|
| D-001 | Las previsiones, las marcas del calendario y los atajos de fecha («+7 días») se paran en el 31 de diciembre de 9999. | Es el último día que la app sabe representar. |
| D-002 | En «cada N meses» y «trimestral», el campo «Primera vez» nunca queda vacío: empieza en el día de hoy del mes que toque y se recalcula si cambias de frecuencia. | Un campo vacío dejaría el formulario bloqueado sin explicar por qué. |
| D-003 | La fecha de «Una sola vez» tiene que ser posterior a la fecha de la partida. | Mismo trato que «Primera vez»: programar algo en el pasado no haría nada. |
| D-004 | Si la primera producción de un edificio cae a más de un año vista, su ficha enseña solo la fecha, sin cantidad prevista. | La previsión solo sabe mirar 366 días por delante. |

## Fase 2 · Modelo de datos y copias de seguridad (2026-09-17 y 18)

| # | Decisión | Por qué |
|---|---|---|
| D-005 | Una copia de seguridad es una partida entera más los catálogos que usa, con una cabecera que dice la versión y cuándo se exportó. | Así la copia se entiende sola y se puede actualizar a formatos futuros. |
| D-006 | Al importar, la copia se acepta entera o se rechaza entera, con un mensaje en castellano que dice qué falla. | Una partida importada a medias sería peor que no importar nada. |
| D-007 | Al importar, tus categorías y tipos propios se unen por nombre a los que ya tienes en la tablet, en vez de duplicarse. | Evita acabar con la misma categoría dos veces en la lista. |
| D-008 | La app guarda el historial de todos los avances de días (qué cambió y de qué avisó) y, solo del último, una foto del estado anterior. | Permite volver a ver el último avance sin doblar el tamaño del archivo. |
| D-009 | «Última sesión» es la última vez que abriste la partida, no la última que la cambiaste; exportar una copia no cuenta como cambio. | Es lo que uno espera al ver «última partida usada» en la pantalla de inicio. |
| D-010 | Unidades de los 14 recursos que no la tenían: saco (sal, carbón), haz (leña), fardo (cuero, tela, hierbas), caja (herramientas, armas, vidrio), pan (cera), barril (carne, vino, pescado) y lingote (oro en bruto). Se cambian en «Listas y catálogos». | Son las más naturales sin inventar medidas nuevas. |
| D-011 | Los movimientos de una caravana van a «Víveres del almacén» si llevan víveres y a «Comercio» en los demás casos. | «Víveres del almacén» ya es una de las categorías que trae la app. |
| D-012 | Las deudas no tienen campo «concepto»: va en las notas. El interés es opcional y los impagos se acumulan en la propia ficha. | Añadir un campo más para lo que ya cabe en las notas no compensaba. |
| D-013 | Salarios y soldadas se guardan por trabajador y por soldado, y al pagarse salen como un solo movimiento con su detalle. | Es como lo enseñan las pantallas de la aldea. |
| D-014 | Límites de los campos que la especificación no fijaba: interés y participación del 0 al 100 con 2 decimales, nivel de un pergamino del 1 al 50, nombres de 1 a 60 letras, notas hasta 1.000, cantidades de recursos con decimales y objetos o animales en números enteros. | Se copian los límites que la especificación sí da en campos parecidos. |
| D-015 | La partida de ejemplo arranca a finales de marzo de 1640 y sus avances de días son 31/3 → 6/4 → 10/4 → 12/4. | Encaja con el historial corto que elegiste; la fase 9 lo alargará. |
| D-018 | Una obra o una caravana «programada» puede tener la fecha ya pasada, y una copia así se importa sin problemas. | Es lo que pasa cuando el día señalado falta dinero o materiales: la obra no empieza, avisa en rojo y sigue esperando. |
| D-017 | Las cinco tablas de la base de datos exigen siempre la clave al guardar, en vez de dejarla opcional como propone Dexie. | Los identificadores los pone la app, no la base: si falta uno, es un fallo y conviene que salte al compilar. |
| D-016 | Todo lo demás de la fase 2 es puramente técnico (nombres de archivos, identificadores internos, biblioteca de validación, orden de las claves del JSON) y no cambia nada de lo que ves ni de las reglas del juego. | Está explicado tarea a tarea en el plan de la fase 2. |

## Decisiones tuyas

Estas no se tocan sin preguntarte. El texto completo está en la especificación (`docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`), marcado «decidido por el usuario».

| Cuándo | Decisión |
|---|---|
| 2026-09-16 | Las deudas de los asentamientos van en Tesorería; el vencimiento solo avisa; los movimientos vinculados se editan desde su origen; una acción manual puede dejar la caja en negativo, avisando. |
| 2026-09-17 | Producción de los edificios: solo extracción, los cambios a media semana cuentan en proporción a los días, y varios productos por edificio. |
| 2026-09-17 | El estudio de hechizos va por hechizo, sin contar días, y puede haber varios en estudio a la vez. |
| 2026-09-17 | Impuestos de locales comerciales: un porcentaje de lo que producen al mes con un mínimo, en una lista aparte. |
| 2026-09-17 | Las 10 propuestas de la revisión (eventos de partida, traslado de recursos, ración fija, categoría «Inversiones»…). |
| 2026-09-17 | Fechas: el año va de 1 a 9999; una frecuencia anual no admite un día que su mes nunca tiene; hay fecha de inicio opcional («no antes de»). |
| 2026-09-17 | Formularios con frecuencia: «Primera vez» y los límites valen en todos; con «Una sola vez» hay un solo campo de fecha; «Inversión» lo llama «Primer cobro»; «Avanzar días» no pasa del 31 de diciembre de 9999. |
| 2026-09-17 | Una equivalencia no puede hacer que 1 mithril valga más de 1.000.000.000 monedas de hierro. |
| 2026-09-17 | La producción ya ocurrida se guarda con sus cantidades, para que el calendario las siga enseñando. |
| 2026-09-17 | La partida de ejemplo lleva un historial corto (finales de marzo y abril de 1640), aunque los recuentos de alguna pantalla queden bajos hasta la fase 9. |
| 2026-09-17 | «Ingreso o tributo» lleva categoría editable, para que salgan Impuestos, Rentas y Tributos por separado. |

## Pendientes

Claude los decidirá al llegar a su fase y los añadirá arriba como D-NNN, salvo que se los digas antes.

- **Interés de una deuda**: qué rango y cuántos decimales. Recomendación: del 0 al 100 con 2 decimales, como el resto de porcentajes.
- **«7 noches» o «7 días»** en los gastos diarios. Recomendación: decidirlo antes de la fase 3; si no lo quieres, todo dirá «días» y se borra el campo.
- **Formas de fecha que aún no existen** («viernes 13 de abril», «Abril de 1640 T.E.», «Del 12 al 19 de abril»). Recomendación: añadirlas al planificar las pantallas.
- **Qué pasa con «Primera vez» al reanudar un pago pausado.** Recomendación: la pausa se salta sus cobros y al reanudar sigue con el siguiente, sin recuperar los perdidos.
- **Ocho casos límite** de los campos de frecuencia cerca del año 9999 y de los horizontes de previsión. Recomendación: aplicar lo ya anotado al planificar esos formularios.
- **Dos anotaciones del canvas de diseño** desfasadas (la de «Edificio» y la de «Avanzar días»). Recomendación: corregirlas al llegar a las vistas.
