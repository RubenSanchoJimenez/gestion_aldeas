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

## Fase 3 · Motor de dinero (2026-09-18)

| # | Decisión | Por qué |
|---|---|---|
| D-019 | Desde la fase 3, «Avanzar días» ya cobra los beneficios de las inversiones, aplica los eventos que cambian impuestos, rentas y pagos, y cobra la vuelta de las caravanas de venta. La hoja de ruta lo dejaba para las fases 4 y 5. | Sin eso, la vista previa del 12 al 19 de abril no da las cifras que promete la fase 3 (Tharan +0,66 mo, Bree +39,9 mo, 8 movimientos). |
| D-020 | Si una caja no llega para un pago, se paga fila a fila lo que haya y solo lo que falta queda como impago. El movimiento lleva lo que se pagó de verdad; si no se pudo pagar nada, no hay movimiento, salvo en un pago programado, que se queda en el libro aunque sea con 0. | «Queda como impago solo lo que no se paga» (§9), y el libro enseña lo que salió de la caja. |
| D-021 | En un gasto diario con impago, «· 7 noches» cuenta solo los días que se pagaron, y lo que faltó va a la deuda en un solo cargo por avance, con la fecha del primer día sin dinero. | El impago se agrupa igual que su movimiento. |
| D-022 | Un cobro o un pago automático que sale a 0 (por un evento de −100 % o un impuesto por habitante sin habitantes) no crea movimiento. | Es lo que la especificación ya hace con los locales: «si ningún local paga, no hay movimiento». |
| D-023 | Si el nombre automático de la contraparte de un impago pasa de 60 letras, se corta con «…»; si se queda en una letra o coincide con un nombre de los filtros («Todos», «Todas»…), se le añade « (impago)». | «Personas y entidades» no admite esos nombres. |
| D-024 | El aviso rojo de un impago dice «La caja de Bree no pudo pagar a Trabajadores de Bree: 1,2 mo pendientes» y sigue en Inicio mientras quede algo por pagar de esa deuda. | Cuadra con la cifra «Impagos» de A2b, que cuenta las deudas de impago abiertas. |
| D-025 | El aviso «Pago no cubierto» mira el siguiente pago de cada regla y de cada pago programado, hasta un año vista, contando todo lo que entra y sale hasta ese día. Los salarios y las soldadas de un día avisan juntos: «La caja de Bree no cubre los salarios de 4,2 mo del 20 de abril». | Así sale el aviso de Archet del 19 de julio y no sale ninguno el 12 de abril, como en las vistas. |
| D-026 | Un evento con efecto sobre «gastos» cambia los gastos recurrentes que se pagan desde la caja de ese asentamiento, y «todos los ingresos» son sus impuestos y rentas, sin los locales. Los pagos programados, los beneficios de inversiones y los ingresos recurrentes del personaje nunca cambian con un evento. | Un asentamiento no tiene otros gastos recurrentes, y un pago programado es un importe que tecleaste tú. |
| D-027 | El balance mensual y el resultado fiscal no tienen en cuenta los eventos, ni los gastos o ingresos recurrentes del personaje que usan la caja del asentamiento. | La especificación solo cuenta impuestos, rentas, locales, salarios, soldadas y tributos, y el balance no cambia con un avance (§9). |
| D-028 | Un local que cierras o abres hoy cuenta así en el balance desde ya, aunque el cambio valga desde mañana para el cobro. | Es lo que acabas de marcar en el local; el cobro sí respeta el «desde mañana». |
| D-029 | Los salarios y las soldadas que se pagan «Cada día» van en un solo movimiento por avance, como los demás gastos diarios: «Salarios de 3 trabajadores · 7 días». | Aplica la regla de los gastos diarios y evita un movimiento por día. |
| D-030 | Se conserva «noches»: la posada dice «Posada El Poney Pisador · 7 noches» y los demás gastos diarios «· 7 días»; con un solo día, «1 noche» o «1 día». | Es lo que enseñan las vistas y el ejemplo. Cierra el pendiente «7 noches o 7 días». |
| D-031 | Textos que la especificación no escribía: «Salarios de 1 trabajador»; «Soldada de la guarnición», sin número; «Impuestos de locales · enero, febrero y marzo (4)», con el año solo si los meses cruzan de año; «Beneficio de Barcaza del Brandivino»; «Caravana: venta de cerveza en Fornost». Con un evento, el concepto no cambia («Aranceles del mercado»), y en el detalle de los salarios el oficio va en singular con 1 («Pastor»). | Siguen las vistas y el ejemplo. «Con la feria» y «(día 15)» son rótulos de la vista previa, no del movimiento. |
| D-032 | «Qué ha pasado», en el resumen del avance, cuenta de momento los tributos pagados, los cobros de impuestos de locales y las caravanas de venta que vuelven, con su día («Tributo de Archet pagado · 19»). Los salarios, las soldadas y los beneficios no salen. | Es lo que enseña P5; la especificación no da una regla. |
| D-033 | Solo un movimiento suelto puede tener fecha futura. Una transferencia, una venta, un pago o alta de deuda, el capital o la retirada de una inversión y la compra de un pergamino se anotan con fecha de hoy o anterior. Las obras, caravanas y compras programadas siguen sus propias reglas. | Así el avance nunca tiene que pagar a medias algo que depende de otro registro, y las transferencias ya no se marcan en el calendario (§4). |
| D-034 | Un pago programado con «Añadir también al inventario» crea el objeto al aplicarse aunque la caja no llegue a pagarlo entero; lo que falta queda como impago. Si ya hay una fila con el mismo nombre, ubicación y valor, se suma a ella. | La compra se hizo; lo que falta es una deuda. |
| D-035 | Al eliminar un trabajador o una unidad, sus pagos pasados siguen en el pago agrupado de salarios o soldadas del asentamiento, con su nombre; solo pierden el enlace a la fila borrada. | Ese pago es de todo el asentamiento y lleva también a los demás trabajadores. |
| D-036 | La renta de un edificio se sigue cobrando aunque el edificio deje de estar «Alquilado», y un edificio alquilado puede quedarse sin renta. | La especificación la trata como un ingreso más de A3, que se conserva al borrar el edificio, y A7b admite «Sin renta». |
| D-037 | Al reanudar un gasto o ingreso en pausa, sigue con su calendario de siempre desde mañana: no recupera lo que se saltó ni cambia su «Primera vez». Si era de «Una sola vez» y la fecha pasó en pausa, ya no ocurre. | Es «la próxima fecha se calcula desde hoy» sin tocar lo que tecleaste. Cierra ese pendiente. |
| D-038 | «Se perderán N cambios» cuenta cada vez que guardas algo que cambia la partida: una transferencia cuenta 1 aunque toque tres registros, y un interruptor de J5, también 1. Guardar sin cambiar nada no cuenta. | Es lo que uno entiende por «un cambio». |
| D-039 | Después de deshacer un avance ya no se puede deshacer el anterior. | Solo se guarda la copia del último avance (D-008). |
| D-040 | Los avisos nombran a las personas con su nombre completo guardado («con Hobart Brezal, herrero»), no con un nombre corto. | La app no guarda nombres cortos y deducirlos sería inventar. |
| D-041 | Mensajes nuevos: «Los días de un avance van de 1 a 366», «No hay ningún avance que deshacer», «La partida cambió después de la vista previa: vuelve a calcularla», «Este movimiento se edita desde su origen», «En un cobro de impuestos de locales solo se cambia el importe total», «Una transferencia no puede tener fecha futura», «Tienda tiene 2 locales: cámbialos de tipo antes» y «Ese mes no se puede anotar: ya está cobrado o todavía no ha llegado». | La especificación no los escribe; siguen el tono de los que sí escribe. |
| D-042 | Todo lo demás de la fase 3 es técnico (cómo se redondea el balance, en qué orden se guardan los movimientos, qué comprueban las copias, cómo se prueban las cifras) y no cambia nada de lo que ves ni de las reglas del juego. | Está explicado tarea a tarea en el plan de la fase 3. |

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
- **Formas de fecha que aún no existen** («viernes 13 de abril», «Abril de 1640 T.E.», «Del 12 al 19 de abril»). Recomendación: añadirlas al planificar las pantallas (la fase 3 ya añade las listas de meses y el día de un hecho).
- **Ocho casos límite** de los campos de frecuencia cerca del año 9999 y de los horizontes de previsión. Recomendación: aplicar lo ya anotado al planificar esos formularios.
- **Dos anotaciones del canvas de diseño** desfasadas (la de «Edificio» y la de «Avanzar días»). Recomendación: corregirlas al llegar a las vistas.
