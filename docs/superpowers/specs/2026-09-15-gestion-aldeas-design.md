# Gestión de Aldeas — Especificación de diseño

Fecha: 2026-09-15 · Revisión final: 2026-09-16 · Producción de los edificios: 2026-09-17 · Estudio por hechizo, impuestos de locales y propuestas aceptadas: 2026-09-17 · Frecuencias, fecha de inicio y año máximo: 2026-09-17 · Fecha de los formularios con frecuencia, producción antes de la primera ocurrencia y límite del avance: 2026-09-17 · Criterios por defecto de primera vez, una sola vez y fecha máxima: 2026-09-17
Estado: validada con el usuario (navegación y flujo de avance de días). Revisada en coherencia con los artboards: inventario completo de vistas, selectores con buscador, cálculo en oro, víveres en sacos de 30 kg y reservas del almacén. **Revisión final del 2026-09-16**: incorpora las decisiones del usuario de ese día, el diseño de las altas desde los desplegables (6.6) y las correcciones de la revisión (avisos, motor, movimientos vinculados, eliminación, validación y datos del ejemplo). **Decisiones del 2026-09-17**: producción de los edificios, estudio de hechizos por hechizo, impuestos de locales comerciales (A3b y A3c), aceptación de las propuestas de la revisión y, durante la fase 1 de la implementación, frecuencias, fecha de inicio y año máximo de las fechas. En una segunda ronda: la fecha de «Una sola vez» en los formularios de dinero, la «Primera vez» de cada N meses y trimestral, el campo «Primer cobro» de «Inversión», la producción antes de la primera ocurrencia y el límite de «Avanzar días». No quedan propuestas pendientes. Quedan por confirmar con el usuario cuatro criterios por defecto del 2026-09-17: el valor inicial de «Primera vez» en cada N meses y trimestral, la fecha de «Una sola vez» posterior a la fecha actual, la fecha máxima en previsiones y atajos de fecha, y la primera ocurrencia lejana en A7 y A7b.

**Decisiones del usuario del 2026-09-16**:
- Las deudas de los asentamientos van en Tesorería › Deudas (A2b).
- El vencimiento de una deuda solo avisa: no paga nada (secciones 7 y 9).
- Los movimientos vinculados se editan desde su origen (6.4).
- Una acción manual puede dejar una bolsa o caja en negativo, con aviso y confirmación (6.4).

**Decisiones del usuario del 2026-09-17** (producción recurrente de los edificios):
- Solo extracción: un edificio genera sus recursos sin gastar nada del almacén. La transformación queda fuera de alcance (secciones 7 y 11).
- Periodo parcial proporcional: los cambios de trabajadores, estado o eventos durante el periodo cuentan en proporción a los días (secciones 7 y 9).
- Varios productos por edificio: cada edificio tiene una lista de producciones, cada una con su recurso, cantidad y frecuencia (A7, A7b, 6.4 y sección 8).

**Decisiones del usuario del 2026-09-17** (estudio de hechizos):
- El estudio va por hechizo, no por lista. El jugador escribe el nombre del hechizo y anota sus intentos buenos y malos. Lo marca como aprendido cuando lo decida el máster (J7, J8, 6.4, 6.6 y secciones 7 y 8).
- No se cuentan días de estudio. Desaparecen los días acumulados, los días dedicados, «Sumar días al avanzar» y el paso «Días de estudio» del motor (secciones 7 y 9).
- Lista, reino y nivel son datos opcionales del hechizo, solo para ordenar y buscar. Nada se cuenta por lista.
- Varios hechizos pueden estar en estudio a la vez. Sustituye la propuesta «una sola lista en estudio».

**Decisiones del usuario del 2026-09-17** (impuestos de locales comerciales):
- Cada tipo de local fija su impuesto: un porcentaje de lo producido en el mes y un mínimo al mes (6.4 y sección 7).
- Cada local tiene una producción habitual al mes, en dinero. El jugador puede anotar lo que produjo de verdad en un mes (A3c).
- Los locales van en una lista aparte en Tesorería › Impuestos y rentas (A3b). Son negocios de terceros del asentamiento que pagan impuestos a la caja. Su producción es dinero y no entra en el almacén: no son los edificios de Producción.

**Decisiones del usuario del 2026-09-17** (propuestas de la revisión; en el texto llevan la marca «(propuesta aceptada por el usuario el 2026-09-17)»):
1. Aceptada: eventos de partida, sin efectos económicos (P3 y 6.4).
2. Aceptada: ingresos recurrentes del personaje en J5.
3. Aceptada: traslado de recursos entre asentamientos (A10b).
4. Sustituida: «una sola lista de hechizos en estudio» deja paso al estudio por hechizo, con varios en estudio a la vez (J7 y sección 7).
5. Aceptada: ámbito de los catálogos, de la app o de cada partida (6.5 y sección 8).
6. Aceptada: ración fija, sin «Cambiar ración» (P1 y P6).
7. Aceptada: compra y venta de animales y armería con «Nuevo movimiento» (A6b y A12).
8. Se mantiene quitada la base «Porcentaje de las ventas del mercado» (n.º 26). La sustituye el impuesto de locales comerciales (A3b).
9. Aceptada: categoría de la app «Inversiones» (n.º 6).
10. Aceptada: quitar una producción en A7b sin J2d, confirmando con «Guardar cambios» (6.4).

**Decisiones del usuario del 2026-09-17** (frecuencias y fechas, tomadas durante la fase 1 de la implementación):
- El año de una fecha va de 1 a 9999 («El año debe estar entre 1 y 9999») (sección 4).
- Frecuencia anual: se rechazan los días que el mes no tiene en ningún año («Abril no tiene 31 días»). El 29 de febrero se admite y en los años no bisiestos cae el 28. Mensual, cada N meses y trimestral no cambian (sección 4).
- Fecha de inicio opcional («no antes de») en cada día, semanal, mensual y anual. En los formularios de dinero, la fecha del primer pago o cobro es la «Primera vez» o la fecha de inicio, según la frecuencia (sección 4, 6.4 y 6.5).
- «Primera vez», los límites de N y la fecha de «Una sola vez» valen en todos los formularios con frecuencia, no solo en la producción (6.4 y 6.5).
- Que «Primera vez» y la fecha de inicio sean posteriores a la fecha actual se comprueba solo en el formulario, al crear la regla o al cambiar su frecuencia (6.4).
- Recurrencia del modelo: la unión por tipo del código. La próxima fecha se calcula y no se guarda; RecurrenteDinero no guarda primeraFecha (sección 8).
- Balance de Bree: la cifra exacta es −11,4714 mo; en pantalla sigue «−11,5 mo» (A1 y sección 7).

**Decisiones del usuario del 2026-09-17** (segunda ronda de la fase 1 de la implementación):
- Formularios de dinero con fecha del primer pago o cobro: con «Una sola vez», ese único campo de fecha, con su etiqueta, es la fecha de «Una sola vez». El campo de frecuencia no muestra otra (6.4 y 6.5).
- Cada N meses y trimestral: al elegir o cambiar el día del mes (o N), «Primera vez» se recalcula al día elegido del mes de «fecha actual + N meses» (+ 3 meses en trimestral); del 29 al 31, el último día si ese mes no lo tiene. Si se cambia a mano, debe caer en ese día («La primera vez debe caer el día 15 del mes»). Sustituye al valor inicial «fecha actual + N meses» o «+ 3 meses» (sección 4, 6.4, 6.5 y sección 8).
- Formulario «Inversión»: su campo de fecha se llama «Primer cobro» (antes «próxima fecha»), como en J5. J6 sigue mostrando el próximo cobro calculado (J6 y 6.4).
- Producción: los días anteriores al periodo de la primera ocurrencia cuentan 0, con «Primera vez» o con fecha de inicio. Así no se acumula producción antes de tiempo (secciones 7, 8 y 9).
- «Avanzar días» no puede pasar del 31 de diciembre de 9999, porque el año máximo es 9999: «No se puede avanzar más allá del 31 de diciembre de 9999» (P4, 6.4 y sección 9).

**Criterios por defecto del 2026-09-17 (pendientes de confirmar por el usuario)**. No son decisiones del usuario: se fijaron durante la fase 1 de la implementación para casos que las decisiones no resolvían. En el texto llevan la marca «(criterio por defecto del 2026-09-17; revisable)»:
- Cada N meses y trimestral, valor inicial: al elegir el tipo, el día del mes empieza con el día de la fecha actual. Así, «Primera vez» empieza en ese día del mes de «fecha actual + N meses» (+ 3 meses en trimestral; el último día si ese mes no lo tiene). «Primera vez» también se recalcula al cambiar de tipo (por ejemplo, de trimestral a cada N meses), conservando el día del mes elegido. Nunca queda vacía (sección 4, 6.4 y 6.5).
- La fecha de «Una sola vez» debe ser posterior a la fecha actual, en todos los formularios con frecuencia, también en los de dinero. Se comprueba como «Primera vez» y la fecha de inicio: solo en el formulario, y solo al crear la regla o al cambiar su frecuencia o esa fecha (6.4 y 6.5).
- Fecha máxima fuera de «Avanzar días»: las previsiones y simulaciones (próximos 7 días, marcas del calendario, previsión a 30 días, días de reserva, A7 y A7b) y los atajos de fecha («+7 días» y similares) se cortan en el 31 de diciembre de 9999: no calculan ni ofrecen fechas posteriores. P4 no cambia (sección 4, 6.4, 6.5 y secciones 7 y 9).
- Primera ocurrencia lejana en A7 y A7b: si la primera ocurrencia de una producción cae fuera del horizonte de su previsión (más de 366 días), se muestra solo su fecha, sin cantidad prevista (A7, A7b, 6.4 y secciones 7 y 9).

## 1. Contexto

Aplicación de apoyo para una partida de rol de mesa de *El Señor de los Anillos* con reglas de **MERP / Rolemaster**. La partida es individual: un máster y un jugador. El jugador es el único usuario de la app y la usa en la mesa para llevar:

- Su **economía personal** (un único personaje por partida).
- La economía de uno o varios **asentamientos** (aldea, pueblo o ciudad) si posee tierras.
- El **paso del tiempo**: un calendario con eventos y pagos que se procesan automáticamente al avanzar días.
- El **registro del aprendizaje de hechizos**, hechizo a hechizo (solo registro, sin tiradas).

El máster no usa la app; el jugador anota lo que el máster decide (eventos narrativos).

## 2. Restricciones

| Aspecto | Decisión |
|---|---|
| Dispositivo | Tablet en horizontal, con la orientación bloqueada. Artboards de 1180×820. Tamaño mínimo 1024×700 |
| Usuarios | Un único perfil: el jugador. Sin cuentas |
| Datos | Local en el dispositivo, funciona sin conexión. Varias partidas. Copia de seguridad exportable e importable (JSON): cada copia es una partida completa |
| Reglas | MERP / Rolemaster |
| Calendario | Gregoriano actual con los meses de hoy; el año de la partida equivale al año real |
| Dinero | Todo se calcula y se muestra en monedas de oro; se puede introducir en cualquier moneda |
| Tiempo | El jugador pulsa «Avanzar días», ve una vista previa y confirma; la app aplica todo |
| Estilo | Pergamino legible |

## 3. Sistema monetario

Monedas de MERP, con abreviaturas en castellano. Equivalencias confirmadas con el usuario el 2026-09-15:

| Moneda | Abrev. | Equivalencia por defecto |
|---|---|---|
| Mithril | mm | 1 mm = 100 mo |
| Oro | mo | 1 mo = 10 mp |
| Plata | mp | 1 mp = 10 mb |
| Bronce | mb | 1 mb = 10 mc |
| Cobre | mc | 1 mc = 10 me |
| Estaño | me | 1 me = 10 mh |
| Hierro | mh | unidad base |

- **Todo se muestra en monedas de oro (mo)** con los decimales necesarios: bolsa, cajas, precios, salarios, deudas y movimientos (por ejemplo «46,518 mo»). Decidido por el usuario el 2026-09-15.
- **Campo de importe** (componente único): cantidad + moneda (selector) + «= X mo» calculado al momento, sobre fondo oro claro. Se usa en **todos** los sitios donde se introduce dinero, también en J2b:
  - Nuevo y editar movimiento (gasto e ingreso) y transferencia (J2b, J2c y J2f).
  - Bolsa inicial del personaje, que admite varias filas de monedas que se suman (38 mo + 25 mp + 40 mb + 18 mc = 40,918 mo).
  - Saldo inicial en la primera fila del libro (J2 y A2).
  - Caja inicial de un asentamiento (A0 y «Editar asentamiento»).
  - Valor de objetos (también el de un pergamino) y precio de venta.
  - Valor por unidad de la armería.
  - Valor por cabeza de los animales.
  - Principal de deudas y préstamos, pagos y cobros.
  - Capital y beneficio de inversiones, e importe recuperado al retirarlas.
  - Gastos e ingresos recurrentes.
  - Salarios y soldadas.
  - Impuestos, rentas y tributos.
  - Mínimo al mes de un tipo de local, y producción habitual y del mes de un local comercial (A3b y A3c).
  - Precios de mercado (también en «Nuevo mercado» y «Nuevo recurso»).
  - Precio por unidad de una caravana.
  - Coste de obras.
  - Precio por saco al añadir víveres y precio por unidad al añadir existencias.
- **Cálculo**: al teclear, cantidad × valor de la moneda se convierte a entero en la unidad más pequeña (hierro; 1 mo = 100.000 mh). Todas las operaciones (sumas, saldos, intereses, prorrateos, precios × cantidad) se hacen sobre esos enteros. Nada se calcula en la moneda introducida. La conversión a mo es solo de presentación.
- **Redondeo**:
  - Lo introducido se redondea al mh más cercano; las mitades, hacia arriba.
  - Porcentajes, prorrateos y divisiones se calculan en mh con el mismo criterio.
  - Los importes se muestran con los decimales necesarios, sin ceros finales («0,6 mo», «46,518 mo»).
  - Las cifras prorrateadas (equivalente al mes, balance mensual) se muestran con 1 decimal («−11,5 mo»).
  - Las cantidades de recursos se calculan con decimales y se muestran enteras; si una cantidad mayor que 0 se redondea a 0, se muestra «menos de 1» («unas 0,4 carretadas» se ve como «menos de 1 carretada»). Las cantidades por habitante se guardan y se muestran con hasta 4 decimales.
- **Prorrateo a 30 días** (equivalente mensual, coste al mes y balance):

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

  Los importes por habitante se prorratean con los habitantes actuales.
- **Lo introducido**: el movimiento guarda también lo introducido (por ejemplo «6 mp»), que se enseña como dato secundario en el libro. Es **opcional**: queda vacío en los importes calculados o agrupados (intereses, movimientos agrupados del avance, impuestos por habitante e impuestos de locales) y en la bolsa inicial de varias filas. J2c abre esos movimientos con la cantidad en mo.
- No hay desglose de monedas físicas ni cambio entre monedas: cada bolsa o caja es un único saldo.
- Las equivalencias se eligen al crear la partida (P1, «Editar equivalencias») y después son de solo lectura, porque cambiarlas alteraría el valor de todo lo registrado.
- **Saldo negativo**: el motor nunca deja una caja en negativo; una acción manual sí puede, con aviso y confirmación (regla en 6.4).

## 4. Calendario

Decidido por el usuario el 2026-09-15, en sustitución de los cómputos de la Tierra Media.

- Se usa el **calendario gregoriano actual** con los meses de hoy (enero a diciembre) y la semana de lunes a domingo.
- El año de la partida **equivale al año real con el mismo número**: una partida en el 1450 T.E. usa la duración de los meses, los bisiestos y los días de la semana del año 1450, calculados con el calendario actual (no el juliano que regía en 1450).
- La **Edad** es solo una etiqueta que acompaña al año («1640 T.E.»). Abreviaturas: **S.E.** (Segunda Edad), **T.E.** (Tercera Edad) y **C.E.** (Cuarta Edad).
- **Validación de fechas**: el día se valida según el mes y el bisiesto del año elegido (no existe el 31 de abril ni el 29 de febrero de un año no bisiesto). El año va de 1 a 9999; si no, «El año debe estar entre 1 y 9999» (decidido por el usuario el 2026-09-17). El error sale bajo el campo.
- **Fecha máxima**: el 31 de diciembre de 9999.
  - «Avanzar días» no puede pasarla (P4 y sección 9) (decidido por el usuario el 2026-09-17).
  - Las previsiones y simulaciones (próximos 7 días, marcas del calendario, previsión a 30 días, días de reserva, A7 y A7b) y los atajos de fecha («+7 días» y similares) se cortan en esa fecha: no calculan ni ofrecen fechas posteriores (criterio por defecto del 2026-09-17; revisable).
- **No hay festivos predefinidos**: el máster los anuncia y el jugador los crea como eventos narrativos. Un festivo o una noticia sin efectos económicos puede ser un evento de partida (P3) (propuesta aceptada por el usuario el 2026-09-17).
- La fecha actual de la partida se guarda como fecha (año, mes, día). La fecha inicial y la Edad se corrigen en «Editar partida» mientras no haya ningún avance.
- **Recurrencias**: cada día, cada N días, semanal (un día de la semana), cada dos semanas, mensual (un día del mes), cada N meses, trimestral, anual (un día de un mes) y una sola vez (una fecha). El campo de frecuencia se describe en 6.4 y en el selector n.º 13 (6.5).
  - Mensual, cada N meses y trimestral: si el día elegido no existe en un mes (el 31 en abril o el 29 de febrero en un año no bisiesto), se usa el último día de ese mes.
  - Anual: se rechazan los días que el mes no tiene en ningún año, con el error «Abril no tiene 31 días» (o «Febrero no tiene 30 días») bajo el campo. El 29 de febrero se admite: en los años no bisiestos cae el 28 (decidido por el usuario el 2026-09-17).
  - **«Primera vez»**: cada N días, cada dos semanas, cada N meses y trimestral cuentan sus periodos desde la «Primera vez», que es su primera ocurrencia. No hay ocurrencias anteriores.
    - En cada N meses y trimestral, la «Primera vez» cae en el día del mes elegido o, si su mes no lo tiene, en el último día. Si no, error bajo el campo. El formulario la recalcula al elegir o cambiar el día del mes (o N): campo de frecuencia en 6.4 (decidido por el usuario el 2026-09-17).
    - Al elegir el tipo, el día del mes empieza con el día de la fecha actual. La «Primera vez» también se recalcula al cambiar de tipo, conservando el día del mes elegido, y nunca queda vacía (criterio por defecto del 2026-09-17; revisable).
  - **Fecha de inicio** («no antes de»): cada día, semanal, mensual y anual admiten una fecha de inicio opcional. No hay ocurrencias anteriores a ella. No tiene que caer en el día elegido: si no cae, la primera ocurrencia es la siguiente que toque (decidido por el usuario el 2026-09-17).
  - La próxima fecha de una recurrencia no se guarda: se calcula (sección 8).
- **Marcas por día**:
  - Pagos y cobros.
    - Impuestos de locales: una marca de cobro «Impuesto locales» por asentamiento y día de cobro, aunque cobren varios tipos. Si ningún local paga ese día, no hay marca. Las previsiones usan la producción anotada del mes cobrado si la hay y, si no, la habitual (decidido por el usuario el 2026-09-17).
  - Eventos narrativos, de un asentamiento o de la partida. Marcan su inicio y su fin («Fin feria», «Fin lluvias»).
  - Producción, obras cuando empiezan y cuando terminan, caravanas cuando salen y cuando vuelven, e intentos de aprendizaje. Comparten la marca neutra de la leyenda: «Producción, obras, caravanas y estudio».
    - Intentos: cada intento de un hechizo se marca en su fecha, con el tipo «estudio» (decidido por el usuario el 2026-09-17).
  - Producción: una marca «Producción» por asentamiento y día («Producción de Bree» en Inicio), aunque produzcan varios edificios o productos.
    - El detalle del día muestra una tarjeta por edificio con sus productos («Cantera · piedra 17 · arcilla 7 carretadas»).
    - Las producciones «Cada día» no se marcan, como los gastos diarios, y no cuentan como siguiente elemento en la barra superior.
    - Una ocurrencia que produce 0 no se marca ni sale en P4 ni en P5.
  - Vencimientos de deudas, **como aviso y sin signo** («Vence deuda Hobart»; en el detalle, «Vence · 4 mo pendientes»), no como pago (decidido por el usuario el 2026-09-16).
  - Faltas previstas («Sin víveres»). En el filtro n.º 5 son del tipo «Avisos».
  - Los gastos diarios, los movimientos manuales ya registrados y las transferencias no se marcan; los pagos y cobros programados sí, en su fecha. Si un día tiene más de dos marcas se muestra una y «+N más».
  - El filtro n.º 5 sin nada elegido dice «Todos».
  - La leyenda es la misma en Inicio y en el calendario.
- Las marcas de días futuros salen de la simulación del motor (sección 9), hasta el último día del mes que se ve y como mucho 366 días. Nunca pasan del 31 de diciembre de 9999 (criterio por defecto del 2026-09-17; revisable).

## 5. Navegación (validada)

Menú lateral fijo con fecha fija en la barra superior (opción A) e inicio con tarjetas por dominio (opción B).

```
┌── Barra superior: partida · fecha · día de la semana · próximo aviso · [Avanzar días] ┐
│ Menú lateral          │ Contenido                                                  │
│  PARTIDA              │                                                            │
│   Inicio              │                                                            │
│   Calendario          │                                                            │
│  DOMINIOS             │                                                            │
│   Tharan (personaje) ▸│  al tocar un dominio se despliega su submenú               │
│   Bree (pueblo)      ▸│  y se abre su Resumen                                      │
│   Archet (aldea)     ▸│                                                            │
│   + Añadir asentamiento                                                            │
│  Ajustes y copias     │                                                            │
└───────────────────────┴────────────────────────────────────────────────────────────┘
```

- Al abrir, la app muestra la última partida usada. Sin partidas, muestra P0 vacío.
- La barra superior es igual en todas las pantallas de una partida. Además de la fecha muestra el **próximo aviso**, con esta prioridad:
  1. El aviso rojo más cercano, con icono de alerta («Víveres de Bree: se agotan el 23»).
  2. Si no hay, el siguiente elemento del calendario («Mañana: salarios de Bree»).
  3. Si no hay nada en 7 días, «Nada previsto esta semana».
- Solo un dominio tiene el submenú desplegado a la vez. Tocar un dominio plegado lo despliega y abre su Resumen; tocar el que ya está desplegado no hace nada.
- Todas las filas del menú miden 44 px (uso táctil). El personaje tiene 7 entradas y cada asentamiento 8; las pantallas relacionadas se agrupan en pestañas. Con muchos asentamientos, la lista de Dominios se desplaza:
  - **Personaje**: Resumen · Bolsa y movimientos · Inventario · Deudas y préstamos · Gastos e ingresos · Inversiones · Hechizos. La entrada «Gastos e ingresos» sustituye a «Gastos recurrentes» (propuesta aceptada por el usuario el 2026-09-17).
  - **Asentamiento**: Resumen · Tesorería (pestañas *Caja y movimientos*, *Impuestos y rentas* y *Deudas*) · Población · Personal (pestañas *Trabajadores*, *Guarnición* y *Armería*) · Producción (pestañas *Edificios*, *Almacén* y *Obras*) · Animales · Comercio · Eventos.
  - La pestaña *Deudas* de Tesorería guarda las deudas del asentamiento; el menú sigue con 8 entradas (decidido por el usuario el 2026-09-16).
  - La pestaña *Impuestos y rentas* de Tesorería lleva en la cabecera, a la derecha, los segmentos «Ingresos y tributos · Locales comerciales». El primero abre A3 y el segundo A3b (decidido por el usuario el 2026-09-17).
  - Al entrar en una pantalla con pestañas se abre la primera.
- Todos los asentamientos (Bree, Archet y los que se añadan) usan las mismas pantallas; los artboards muestran Bree.
- «Cambiar de partida» está en Ajustes y copias.
- **Diálogos globales**: «Avanzar días» y «Añadir asentamiento» se abren sobre la pantalla actual. Los artboards de P4 y P5 los dibujan sobre Inicio. Tras crear un asentamiento se abre su Resumen.
- **Diálogos apilados**:
  - Como mucho hay dos diálogos visibles. El de abajo queda atenuado con un segundo velo.
  - Cancelar el de arriba vuelve al anterior con sus datos.
  - J2d sustituye al formulario de edición (no se apila). Su «Cancelar» reabre el formulario con sus datos.
  - En un diálogo de alta ya apilado, los selectores no ofrecen altas, para no abrir un tercer nivel (6.6).
- **Accesos cruzados**:

  | Acceso | Abre |
  |---|---|
  | Tarjeta de un dominio en Inicio | Su Resumen |
  | Un aviso | La pantalla de la tabla de avisos (sección 9) |
  | «Nuevo movimiento» y «Registrar intento» en J1 | J2b y J8, sobre J1 |
  | «Contratar cantero» (A5) | «Contratar trabajadores» con Cantero y Cantera ya elegidos |
  | «Ver evento» (A7) | A11 con el evento seleccionado |
  | «Ver almacén» (P5) | A8 |
  | «Ver deudas» | J4 o A2b, según el dominio |
  | «Ver tesorería» | A2 |
  | Fila de la tabla de saldos de P5 | Libro del dominio (J2 o A2) con el periodo «Último avance (del 12 al 19)» |
  | «Gestionar listas» (P6) | P7 |
  | «en Impuestos y rentas» (renta de un edificio en A7 y A7b) | A3 |
  | Icono de flecha de la fila «Impuestos de locales comerciales» (A3) | A3b |
  | Producción del mes de un local (A3b) | A3c, sobre A3b |
  | Editar un movimiento vinculado | El formulario de su origen (6.4) |

## 6. Módulos y pantallas

Las pantallas marcadas con ◆ son diálogos sobre la pantalla indicada. Cada pantalla o diálogo de esta sección tiene artboard propio; la sección 6.4 lista los formularios que siguen un patrón ya diseñado. Los estados sin artboard van como anotación del canvas junto a su vista (sección 12).

### 6.1 Partida

| # | Pantalla | Contenido |
|---|---|---|
| P0 | Selector de partidas | Partidas guardadas (nombre, fecha en juego, dominios, última sesión), continuar, exportar, «Nueva partida» e «Importar copia»; editar por tarjeta («Editar partida») |
| P1 | Nueva partida · paso 1 | Nombre; fecha inicial (día, mes, año y Edad) con el día de la semana calculado; equivalencias de monedas con «Editar equivalencias»; ración de víveres de solo lectura (1 saco de 30 kg = 1 persona durante 30 días) |
| P1b | Nueva partida · paso 2 | Nombre y descripción del personaje; bolsa inicial en varias filas de cantidad y moneda que se suman en oro |
| P2 | Inicio | Avisos (tabla de la sección 9), tarjetas de cada dominio, próximos 7 días y enlace al resumen del último avance |
| P3 | Calendario | Vista mensual con marcas por tipo (sección 4), filtro por dominios y tipos, detalle del día seleccionado con editar por elemento y «Añadir evento o pago» |
| P4 ◆ | Avanzar días: vista previa (sobre la pantalla actual) | Selector de días (1, 7, 30 u otro), fecha resultante, cambios agrupados por dominio con total, avisos, personas y entidades que se añadirán, y número de movimientos que se registrarán |
| P5 ◆ | Avanzar días: resumen (sobre la pantalla actual ya actualizada) | Saldos antes y después, cambios en el almacén de cada asentamiento, hechos destacados, todos los avisos vigentes, «Ver almacén» y «Deshacer avance» |
| P6 | Ajustes y copias | Equivalencias (solo lectura), ración de víveres (solo lectura), calendario y fecha (solo lectura), panel «Listas y catálogos», exportar e importar copia, cambiar y borrar partida |
| P7 | Listas y catálogos | Las listas de opciones de los desplegables a la izquierda y la tabla de la lista elegida a la derecha (nombre y grupo, dónde se usa y origen), con buscador, «Añadir …» y editar por fila (6.6, patrón 5) |
| P7b ◆ | Eliminar opción en uso (sobre P7) | Variante de J2d con «Sus registros pasan a», resumen de lo que cambia y aviso si hay registros del último avance |

**Detalle**:

- **P0**:
  - Sin partidas: estado vacío con «Nueva partida» e «Importar copia» destacados.
  - Con más de 5 partidas aparece el buscador (n.º 31).
  - «Editar partida»: nombre; fecha inicial y Edad, editables mientras no haya ningún avance; «Eliminar partida» (J2d), que vuelve a P0.
- **Copias**:
  - La copia es una partida completa con versionFormato.
  - Desde P0 se añade. Si ya existe la misma partida (mismo id), pregunta «Reemplazar» o «Importar como copia».
  - Desde P6 reemplaza la partida actual, con confirmación, y solo admite copias de esa partida.
  - **versionFormato**: el formato 1 ya usa Hechizo, TipoLocal y LocalComercial.
    - Una copia con versionFormato mayor que la de la app se rechaza: «Esta copia es de una versión más nueva de la app».
    - Una copia con versionFormato menor se migra al importar, y el resumen lo dice.
  - Opciones de catálogo: la copia lleva las opciones que usan sus registros ({ id, nombre, grupo, plural o unidades, propia }), también las de la app, por si se renombraron. Al importar, las de la app se casan por id: si el nombre difiere, se queda el de esta tablet y el resumen lo dice; si están borradas, se reactivan. Las tuyas se unen por nombre normalizado en la misma lista o se crean con id nuevo, y los registros se remapean.
- **P1**:
  - Ejemplo: fecha inicial **1 de enero de 1640 T.E.** (domingo).
  - Edad con segmentos «Segunda · Tercera · Cuarta»; en las fechas se abrevia S.E., T.E. y C.E. Día y año validados (sección 4).
  - «Editar equivalencias» vuelve editable la tabla en el propio paso: enteros ≥ 2 y, combinadas, 1 mm no puede valer más de 1.000.000.000 mh (100 veces lo normal), para que los saldos guardados en hierro sigan siendo enteros exactos; si se pasa: «Con estas equivalencias, 1 mithril vale demasiado hierro (más de 1.000.000.000 mh); reduce alguna equivalencia» (decidido por el usuario el 2026-09-17), con vista del resultado. Después de crear la partida quedan fijas.
  - Sin enlace «Cambiar ración»: la ración es fija, 1 saco de 30 kg por persona durante 30 días (propuesta aceptada por el usuario el 2026-09-17).
- **P1b**: bolsa inicial del ejemplo: 38 mo + 25 mp + 40 mb + 18 mc = **40,918 mo**.
- **P2**:
  - Avisos con las reglas de la sección 9: primero los rojos; hasta 4 en dos columnas; con más, «Ver todos (N)».
  - Tocar una tarjeta de dominio abre su Resumen.
  - Próximos 7 días con la leyenda común («Producción, obras, caravanas y estudio»). Los vencimientos salen como aviso sin signo.
  - Ejemplo del 12 de abril: víveres de Bree en **ámbar** (se agotan el 23, a 11 días) y «La deuda de 4 mo con Hobart vence el 20 de abril» en ámbar.
  - Ejemplo del 19: víveres de Bree en **rojo** (a 4 días), Hobart en ámbar («Mañana vence la deuda de 4 mo con Hobart») y Archet en ámbar («La caja de Archet no cubre el tributo de 60 mo del 19 de julio»).
  - Tarjetas del ejemplo, antes y después del avance (decidido por el usuario el 2026-09-17):
    - Tharan: fila «Hechizos en estudio · 2».
    - Bree: solo «Balance mensual −11,5 mo». El desglose «entran 44 · salen 55,4» va solo en A1.
- **P3**:
  - El ejemplo marca también: día 1 «Sale caravana Tharbad», «Producción» (arcilla de la cantera) e «Impuesto locales» (cobro de la producción de marzo, ya dentro de la caja de 340,6 mo), día 10 «Sale caravana Fornost», día 20 «Vence deuda Hobart» y día 28 «Fin obra molino (Archet)».
  - Las faltas previstas son marcas («Sin víveres») y entran en el filtro n.º 5 como «Avisos».
  - El detalle del día no agrupa registros distintos, salvo la producción y los impuestos de locales:
    - Producción: una tarjeta por edificio con sus productos (sección 4).
    - Impuestos de locales: una tarjeta por asentamiento y día, aunque cobren varios tipos («Impuestos de locales · marzo (4)» · Bree) (decidido por el usuario el 2026-09-17).
  - Editar un elemento abre:
    - Elemento pasado: su movimiento (J2c, o el formulario de su origen si es vinculado).
    - Ocurrencia futura de una regla: la regla, con el aviso «Cambia esta y las próximas ocurrencias».
    - Producción: si es futura, abre A7b de ese edificio (sin el aviso «Cambia esta y las próximas ocurrencias»); si es pasada, no se edita: lo producido se corrige con un ajuste de existencias en A8.
    - Impuestos de locales: si es pasado, J2c de su movimiento, con el detalle por local; si es futuro, A3b (sin el aviso «Cambia esta y las próximas ocurrencias»).
    - Evento: A11b (o el formulario del evento de partida).
    - Intento: J8 en edición, con «Eliminar».
    - Vencimiento: su deuda.
    - Avisos previstos: no son editables.
  - **Eventos de partida**: «Añadir evento o pago» permite un evento narrativo con ámbito «Partida» (festivos, noticias), sin efectos económicos. Se ve en el calendario y en los próximos 7 días y se edita desde el detalle del día. Los eventos con efectos siguen siendo de un asentamiento (A11b) (propuesta aceptada por el usuario el 2026-09-17).
- **P4**:
  - «Otro…» admite de 1 a 366 días, con aviso ámbar si pasa de 90.
  - No se puede avanzar más allá del 31 de diciembre de 9999, porque el año máximo de las fechas es 9999 (sección 4). Vale para 1, 7, 30 u «Otro…»: si la fecha resultante lo pasa, sale bajo el campo de días el error «No se puede avanzar más allá del 31 de diciembre de 9999» y el botón principal se desactiva (decidido por el usuario el 2026-09-17).
  - El cuerpo se desplaza, con grupos por dominio.
  - Si un impago necesita crear una persona: «Se añadirá «Trabajadores de Bree» a Personas y entidades».
  - Ejemplo del 12 al 19. Bree: una fila «Obras: la puerta termina el 17 · granero 8 % → 25 %» y el consumo de cerveza y leña «−26 barriles · −69 haces». Archet: añade «Consumo de víveres −72 sacos». Avisos: víveres en rojo; Hobart y Archet en ámbar.
  - Tharan no lleva fila de estudio: no se cuentan días de estudio (decidido por el usuario el 2026-09-17).
  - Cada cobro de locales de un avance es una fila del grupo de su asentamiento, en P4 y en P5: «Impuestos de locales · abril (4) (día 1)» +4,5 mo. No hay cobros de locales entre el 13 y el 19, así que el ejemplo no tiene esa fila.
- **P5**:
  - Muestra todos los avisos vigentes al terminar.
  - No lleva días de estudio, porque no se cuentan. En el ejemplo tampoco hay cobros de locales: no hay ninguno entre el 13 y el 19 (decidido por el usuario el 2026-09-17).
  - Cada fila de la tabla de saldos abre el libro de ese dominio con el periodo «Último avance (del 12 al 19)». No hay botón «Ver movimientos».
  - «Ir a comercio» pasa a «Ver almacén» (A8).
  - Almacén de Bree: Madera 420 → 386 y Cerveza 90 → 84. Se añade «Víveres de Archet 900 → 828 sacos».
  - «Deshacer avance» avisa si hay cambios posteriores («Se perderán 3 cambios hechos después del avance»).
- **P6**:
  - Tabla de monedas con filas de 44 px.
  - Fila de solo lectura «Ración de víveres: 1 saco de 30 kg por persona al mes».
  - Panel «Listas y catálogos» (≈125 px, a 16 px bajo la tabla de monedas): texto «Categorías, oficios, tipos, recursos, ubicaciones y personas» y botón «Gestionar listas» con icono derecha, que abre P7.
- **P7** (dentro del marco de la partida, con «Ajustes y copias» activo en el menú):
  - Cabecera: botón de 44 px con icono izquierda, subtítulo «Ajustes y copias · opciones de los desplegables», título «Listas y catálogos» y, a la derecha, «Añadir categoría», cuyo texto cambia con la lista elegida.
  - Izquierda (240 px), panel «Listas» con filas de 44 px y el número de opciones a la derecha:
    - CATÁLOGOS DE LA APP: Categorías 28 (27 de la app y «Posadas del camino»), Oficios 23, Tipos de edificio 24, Tipos de unidad 8, Tipos de defensa 6, Tipos de animal 57 y Recursos 21.
    - LISTAS DE ESTA PARTIDA: Ubicaciones 2 y Personas y entidades 6.
    - Nota de 14 px: «Mercados, hechizos, negocios y tipos de local: en su pantalla.»
  - Derecha (≈636 px), tabla de la lista elegida: segmentos «Todas · Tuyas», desplegable «Todos los grupos» y botón de buscar. Filas de 56 px. Columnas: la primera lleva como encabezado el nombre de la lista en singular («Categoría», «Oficio»…), con el grupo debajo en 13 px; Se usa en (hasta dos líneas), Origen («Tuya», «App», o «App» con candado si no se puede eliminar) y editar.
  - Ejemplo, con «Posadas del camino» ya creada. Filas: Posadas del camino / Tus categorías · 1 movimiento · «Tuya»; Alojamiento / Gastos del personaje · «5 movimientos, 1 gasto recurrente» y «3 más en Los Senderos del Norte» · «App»; siguen Comida y bebida · — · «App»; Montura · «6 movimientos, 1 gasto recurrente» · «App»; Equipo · — · «App»; Hierbas y curación · 1 movimiento (las athelas) · «App»; Salarios / Asentamientos · 12 movimientos · «App» con candado. Pie de 13 px con icono de candado: «28 categorías · las que llevan candado las pone la app: se renombran, pero no se eliminan».
- **P7b**:
  - Se abre desde «Eliminar» en «Editar categoría», que se cierra.
  - Ejemplo: diálogo de 620 px, «¿Eliminar «Posadas del camino»?», subtítulo «Categoría tuya · se usa en 1 movimiento de Tharan».
  - Caja de resumen: «Posada El Poney Pisador · 2 noches» −0,6 mo, «12 de abril · Bolsa de Tharan», y «Partidas afectadas: La Sombra del Este».
  - Aviso oro con reloj de arena: «Lo creó el avance del 10 al 12 de abril. Si lo deshaces, el movimiento desaparece y la categoría sigue eliminada.»
  - Campo «Sus registros pasan a» con «Alojamiento». Ayuda: «Obligatorio: la categoría está en uso. No incluye «Posadas del camino».»
  - Nota en bosque: «Los saldos no cambian: solo cambia la categoría del movimiento.» Casilla «Sé que esto no se puede deshacer» y botón rojo «Eliminar definitivamente».

### 6.2 Personaje

| # | Pantalla | Contenido |
|---|---|---|
| J1 | Resumen | Bolsa, patrimonio, deudas, inversiones, desglose del patrimonio, próximos 30 días, hechizos en estudio con su conteo y «Registrar intento», y «Editar» personaje |
| J2 | Bolsa y movimientos | Saldo en mo; grupo «Programados» encima del libro; libro de movimientos con el saldo inicial como primera fila, filtrable por periodo y categoría, con buscador, importe en mo, moneda introducida y origen |
| J2b ◆ | Nuevo movimiento (sobre J2) | Gasto, ingreso o transferencia (esta abre J2f); campo de importe; concepto, categoría, «Sale de» o «Entra en» y fecha; saldo resultante a la izquierda del pie; con «Gasto», casilla «Añadir también al inventario» con sus campos. Con fecha futura queda programado y se aplica al avanzar |
| J2c ◆ | Editar movimiento (sobre J2) | Igual que J2b con los datos cargados, salvo el tipo, que no se cambia (sin segmentos), y la casilla «Añadir también al inventario», que solo existe al crear. Importe anterior y nuevo, aviso si lo creó un avance y «Eliminar». Muestra el selector de categoría abierto con buscador |
| J2d ◆ | Eliminar (desde cualquier formulario de edición) | Doble confirmación: qué se borra y qué cambia (saldos y totales, según la tabla «Al eliminar» de 6.4), casillas de lo que se puede devolver, aviso si lo creó un avance, casilla «Sé que esto no se puede deshacer» y botón rojo «Eliminar definitivamente», que no se activa hasta marcarla. Es el mismo diálogo para todas las tablas de la app |
| J2e ◆ | Nueva categoría (sobre J2c, con teclado) | Alta rápida (6.6, patrón 2): nombre con contador y validación al teclear, grupo fijo «Tus categorías», «Cancelar» y «Crear y elegir», por encima del teclado de la tablet |
| J2f ◆ | Transferencia (sobre J2) | Variante de J2b: «Sale de» y «Entra en», categoría fija «Transferencias», concepto propuesto, resumen con los dos saldos, aviso en lacre y pie en estado de confirmación por saldo negativo |
| J3 | Inventario valorado | Objetos (nombre, cantidad, valor unitario y total, ubicación, notas), filtro por ubicación, buscador, vender y editar |
| J3b ◆ | Vender objeto (sobre J3) | Cantidad, precio por unidad (campo de importe), «Entra en», comprador (opcional) y fecha; diferencia con el valor anotado, bolsa y patrimonio resultantes |
| J4 | Deudas y préstamos | «Lo que debes», «Lo que te deben» y «Saldadas» (plegado): principal, interés y periodo, vencimiento, estado, pagado, intereses pendientes y pendiente; registrar pago o cobro y editar |
| J4b ◆ | Registrar pago (sobre J4) | Importe pagado (campo de importe), sale de, fecha y «Se aplica a» (segmentos); intereses y capital antes y después, bolsa resultante y próximo interés. «Registrar cobro» es el mismo diálogo con «Entra en» |
| J5 | Gastos e ingresos recurrentes | Gastos e ingresos con importe, frecuencia, próximo cobro, interruptor «Activo / En pausa» y últimos cobros |
| J6 | Inversiones y negocios | Participación, capital, beneficio y periodo, próximo cobro, beneficios cobrados, historial, grupo plegado «Retiradas», retirar y editar |
| J7 | Estudio de hechizos | Hechizos (nombre con lista, reino y nivel debajo; estado; intentos buenos y malos, con iconos; «Último», fecha del último intento; editar), historial de intentos y pergaminos con «Ver en el inventario»; «Añadir hechizo» y «Registrar intento» (decidido por el usuario el 2026-09-17) |
| J8 ◆ | Registrar intento (sobre J7 o J1) | Fecha, hechizo (solo los «En estudio»; al editar, también el del intento), resultado (bueno: estudió bien; malo: estudió mal; solo suma al conteo), pergamino usado, «El pergamino se consume» y notas. Al editar, «Eliminar» (J2d) |

**Detalle**:

- **J1**:
  - Próximos 30 días sin la fila del 15 de mayo, que queda fuera de rango.
  - Vencimientos como aviso: «Vence la deuda con Hobart · 4 mo pendientes · 20 de abril» y «Vence el préstamo del Gremio · 44 mo pendientes · 1 de mayo, tras sumar el interés» (40 de capital + 2 pendientes + 2 del 1 de mayo).
  - Los diálogos que abre (J2b y J8) se muestran sobre J1.
  - Panel «Estudio de hechizos»: lista los 2 hechizos en estudio con su conteo y el botón «Registrar intento» (decidido por el usuario el 2026-09-17).
    - El conteo se muestra con icono check y número de buenos, e icono x y número de malos, como en J7.
    - Ejemplo: «Paso sin rastro» con check 0 y x 2; «Luz de Elbereth» con check 1 y x 0.
- **J2**:
  - Categorías del catálogo en el ejemplo: Recompensas, Hierbas y curación (athelas) y Transferencias. Columna Categoría de 150 px.
  - El Gremio recibió dos pagos de 10 mo solo a capital, el 15 y el 25 de marzo. Así, el 1 de abril el capital era 40 mo y el interés de 2 mo quedó pendiente. No hay pago el 6 de abril.
  - La transferencia desde Bree es vinculada: badge oro «Transferencia» en la columna Origen.
  - Filtro de periodo con «Próximos» y «Último avance». Los programados van en su grupo, con badge «Programado».
- **J2b**:
  - Ejemplo: concepto «Capa élfica», comprada por 120 mp = 12 mo, con «Añadir también al inventario» marcada y sus campos desplegados.
  - Subcaja de inventario. Primera fila: Objeto «Capa élfica» (propuesto del concepto), Cantidad 1 y Ubicación «Encima». Segunda fila: «Valor por unidad» (campo de importe, propuesto como importe ÷ cantidad y editable).
  - El saldo resultante va a la izquierda del pie, no en una caja de resumen: «La bolsa queda en 46,518 → 34,518 mo».
  - Que el patrimonio no cambia (12 mo pasan de la bolsa al inventario) va como anotación del canvas.
  - La casilla solo existe con «Gasto». Se crea una fila nueva en J3, salvo que exista otra con el mismo nombre, ubicación y valor por unidad: entonces se suma.
  - Con fecha futura, el objeto se crea al aplicarse el movimiento.
- **J2c**:
  - Aviso si lo creó un avance: «Si deshaces ese avance, esta edición se perderá.»
  - Los movimientos vinculados no se abren con J2c: su editar abre el formulario de su origen (6.4).
  - Cobro agrupado de impuestos de locales (decidido por el usuario el 2026-09-17): encima del importe total, el detalle por local en solo lectura («Herrería 1 · abril · 10 mo, habitual · +1 mo»). Solo se edita el importe total.
  - Panel del selector de categoría: 400 px, alineado con el borde derecho del campo. Buscador «al» con «5 de 27» a la derecha. GASTOS DEL PERSONAJE: Alojamiento (marcada) y Sobornos y regalos. ASENTAMIENTOS: Salarios, Rentas y alquileres y Víveres del almacén. Pie de 44 px con el enlace «+ Nueva categoría “al”».
- **J2d**:
  - Siempre lista qué se borra y qué cambia (tabla «Al eliminar» de 6.4).
  - Aviso oro si lo creó un avance: «Lo creó el avance del 10 al 12 de abril. Si deshaces ese avance, el movimiento volverá a aparecer.»
  - Si el movimiento añadió un objeto al inventario, casilla «Quitar también las 3 athelas del inventario».
- **J2e** (artboard PersonajeNuevaCategoria):
  - Capas: J2 con velo (tinta al 55 %); «Editar movimiento» de 700 px con el selector cerrado (Posada El Poney Pisador · 2 noches · 12 de abril, Alojamiento, 6 mp = 0,6 mo); segundo velo (tinta al 35 %); diálogo «Nueva categoría» de 600 px en y = 24, de ≈335 px de alto; teclado de la tablet de 380 px abajo.
  - Diálogo: subtítulo «Para «Editar movimiento»: se elegirá al crearla.»; Nombre «Posadas del camino» con «18 de 40», borde oro y cursor al final; línea en bosque «No hay otra categoría con este nombre.»; línea de 14 px «Irá a «Tus categorías» y la verás en todas tus partidas.»; pie «Cancelar» y «Crear y elegir».
  - El diálogo acaba en y ≈ 360 y quedan 80 px hasta el teclado.
  - Tras crear, J2c muestra la categoría con borde oro 2 s y la ayuda «Categoría nueva · la gestionas en Listas y catálogos», el foco en la cantidad y el resumen «Importe anterior −0,2 mo», «Importe nuevo −0,6 mo», «La bolsa queda en 46,118 mo». El selector cuenta 28 categorías.
- **J2f**:
  - Ejemplo: transferencia de 50 mo de la bolsa de Tharan a la caja de Bree el 12 de abril.
  - «Sale de» y «Entra en» deben ser distintos. Categoría fija «Transferencias», como texto, sin selector.
  - Concepto propuesto «Transferencia a Bree» (y «Transferencia desde Tharan» en el lado de Bree).
  - Resumen con los dos saldos: bolsa −3,482 mo en lacre con icono; caja de Bree 390,6 mo.
  - Bajo el resumen, aviso en lacre: «La bolsa quedará en negativo. Puedes guardarlo: Inicio lo marcará en rojo hasta que vuelva a 0 o más, y los gastos que no se puedan pagar al avanzar días quedarán como impagos.»
  - Sin casilla de inventario. Pie en estado de confirmación: en lacre «La bolsa quedará en −3,482 mo», con «Revisar» y «Transferir igualmente».
- **J3**:
  - La lupa busca en nombre y notas.
  - Con un filtro activo, el pie dice «Valor de lo filtrado: X mo de 81,6 mo».
  - Los objetos vendidos del todo quedan archivados y se ven con el filtro «Vendidos».
  - El objeto del pergamino del ejemplo es «Pergamino «Luz de Elbereth»» (decidido por el usuario el 2026-09-17).
  - El objeto de un pergamino consumido o perdido queda archivado, fuera del patrimonio, como los «Vendido» (decidido por el usuario el 2026-09-17).
- **J3b**: no deja vender más unidades de las que se tienen. Editar la venta desde el libro abre J3b con los datos cargados y «Eliminar», que devuelve las unidades. Si el objeto es de un pergamino, el pergamino vuelve a «poseído».
- **J4** (y A2b):
  - Estados abierta, vencida y saldada. Grupo plegado «Saldadas».
  - Tharan no tiene deudas saldadas en el ejemplo, así que el grupo «Saldadas» no aparece en J4 (sí en A2b).
  - Columna «Intereses pendientes».
  - Formulario de deuda con fecha de alta, «El dinero entra en / sale de» y lista de Pagos (6.4).
  - Solo las deudas del personaje: las de un asentamiento están en A2b.
- **J4b**: «Se aplica a» con segmentos: Intereses y capital · Solo capital · Solo intereses. Al editar un pago desde el formulario de la deuda, J4b trae «Eliminar».
- **J5** (propuesta aceptada por el usuario el 2026-09-17):
  - La pantalla pasa a «Gastos e ingresos recurrentes», con segmento Gasto/Ingreso, «Sale de / Entra en» y fecha del primer cobro. Los ingresos se cobran en el paso de cobros del motor.
  - Ejemplo: se añade un ingreso en pausa, «Alquiler de la casa de Archet», +0,5 mo, mensual el día 1.
  - Los interruptores en línea guardan al instante y cuentan como edición. Al reanudar, la próxima fecha se calcula desde hoy.
- **J6**:
  - «Capital recuperado» pasa a «Beneficios cobrados», que se calcula con los movimientos que llevan su inversiónId y regla beneficio. Los movimientos de capital y retirada llevan solo vínculo, sin inversiónId.
  - El patrimonio cuenta el capital completo; la participación es informativa.
  - Formulario con «El capital sale de», «Primer cobro» y «Los beneficios entran en» (6.4). La tarjeta sigue mostrando el próximo cobro, que se calcula (decidido por el usuario el 2026-09-17).
  - Grupo plegado «Retiradas». Retirar se revierte editando la inversión.
- **J7** (artboard PersonajeHechizos; decidido por el usuario el 2026-09-17):
  - El estudio va por hechizo, no por lista. Varios hechizos pueden estar en estudio a la vez. No se cuentan días: no hay «En estudio ahora» ni «Sumar días».
  - Cabecera «Tharan · 2 en estudio · 1 aprendido», con «Añadir hechizo» y «Registrar intento».
  - Panel «Hechizos»: Hechizo (con el detalle debajo: lista · reino · nivel), Estado, Intentos, «Último» (fecha del último intento) y editar.
    - Intentos: icono check y número de buenos, e icono x y número de malos, como en J1.

    | Hechizo | Detalle | Estado | Intentos | Último |
    |---|---|---|---|---|
    | Paso sin rastro | Sendas del bosque · Canalización · nivel 2 | En estudio | check 0 · x 2 | 10 de abril |
    | Luz de Elbereth | Caminos de la luz · Esencia · nivel 3 | En estudio | check 1 · x 0 | 25 de marzo |
    | Hablar con los animales | Voces de la naturaleza · Canalización · nivel 1 | Aprendido el 5 de febrero | check 1 · x 1 | 3 de febrero |

  - Panel «Historial de intentos», el más reciente primero:
    - 10 de abril · Paso sin rastro · malo.
    - 28 de marzo · Paso sin rastro · malo · con su pergamino, que se consumió.
    - 25 de marzo · Luz de Elbereth · bueno.
    - 3 de febrero · Hablar con los animales · bueno.
    - 20 de enero · Hablar con los animales · malo.
  - Panel «Pergaminos», con «Ver en el inventario»:
    - «Luz de Elbereth»: poseído · Esencia · nivel 3 · 8 mo · en la posada.
    - «Paso sin rastro»: consumido · Canalización · nivel 2 · 28 de marzo.
    - Cada pergamino muestra el reino de su hechizo y su propio nivel; si el pergamino no tiene nivel, el del hechizo.
  - Dos notas:
    - «Bueno o malo solo suma al conteo. «Aprendido» lo marcas tú, en el hechizo, cuando lo decida el máster.»
    - «Puedes estudiar varios hechizos a la vez. La app no cuenta días: cada intento guarda su fecha.»
  - «Aprendido» se marca en el formulario «Hechizo», que pide «Aprendido el» (6.4).
  - En el calendario, los intentos van en la marca neutra «Producción, obras, caravanas y estudio».
- **J8** (decidido por el usuario el 2026-09-17):
  - Ejemplo: Fecha 12 de abril de 1640 T.E.; Hechizo «Paso sin rastro» (selector), con la ayuda «En estudio · 0 buenos · 2 malos»; Resultado Bueno · Malo; Pergamino usado «Ninguno» y la casilla «El pergamino se consume», desactivada; Notas.
  - La ayuda del hechizo escribe el conteo en texto; J1 y J7 lo muestran con iconos.
  - Nota: «Bueno o malo solo suma al conteo. «Aprendido» lo marcas en el hechizo cuando lo decida el máster.»
  - Fecha: hoy o antes. Puede ser anterior a la creación del hechizo, para anotar intentos atrasados (sección 7).
  - Hechizo: solo los hechizos «En estudio» (n.º 14). El pie del selector ofrece «+ Nuevo hechizo “…”», que abre el alta rápida (6.6).
    - Si la búsqueda coincide exactamente con un hechizo Aprendido, el pie dice «“Hablar con los animales” está aprendido», sin acción.
  - Pergamino usado agrupa «De este hechizo · Otros» (n.º 16). Los pergaminos sin hechizo salen en «Otros».
  - Casilla «El pergamino se consume», activa solo con un pergamino elegido. Al guardar, el pergamino pasa a «consumido», con la fecha del intento, y su objeto se archiva (fuera del patrimonio, como los «Vendido») sin borrar el pergamino.
  - **En edición** (desde el historial de J7 o desde P3):
    - El selector de hechizo incluye también el hechizo del intento aunque esté Aprendido, en el grupo Aprendidos y como única opción de ese grupo.
    - «Pergamino usado» incluye también el pergamino que consumió ese intento.
    - Si el hechizo está aprendido, la fecha no puede ser posterior a «Aprendido el».
    - Desmarcar «El pergamino se consume» o cambiar de pergamino devuelve el anterior a «poseído» y restaura su objeto.
    - El pie trae «Eliminar» (J2d).

### 6.3 Asentamiento

| # | Pantalla | Contenido |
|---|---|---|
| A0 ◆ | Nuevo asentamiento (desde «Añadir asentamiento», sobre la pantalla actual) | Nombre, tipo, habitantes (con su consumo de víveres) y caja inicial (campo de importe). El asentamiento se crea vacío: sin plantillas (decidido por el usuario el 2026-09-16); los edificios, trabajadores, impuestos, existencias y animales se añaden después |
| A1 | Resumen | Caja, balance mensual, obras, caravanas, próximos pagos y cobros, almacén crítico, eventos, «Transferir» y «Editar» asentamiento |
| A2 | Tesorería · caja y movimientos | Saldo en mo; grupo «Programados»; libro de movimientos editable con el saldo inicial como primera fila; «Nuevo movimiento» y «Transferir» |
| A3 | Tesorería · impuestos y rentas | Segmentos «Ingresos y tributos · Locales comerciales»; paneles Ingresos y Tributos con base, frecuencia, importe y equivalente mensual, y el total al mes en la cabecera de cada panel, sin fila de cifras; la fila «Impuestos de locales comerciales» lleva un icono de flecha que abre A3b; destinatario en los tributos; nota «Resultado fiscal» debajo |
| A3b | Tesorería · locales comerciales | Segmento «Locales comerciales» de Impuestos y rentas. Locales con tipo y titular, producción habitual, producción del mes e impuesto del mes, con fila Total; tipos de local con su impuesto, mínimo y día de cobro; cifra del próximo cobro (decidido por el usuario el 2026-09-17) |
| A3c ◆ | Producción del mes (sobre A3b) | Mes, producción del mes (campo de importe) y nota; resumen con el porcentaje del tipo, el mínimo y lo que se cobra; «Usar la habitual», «Cancelar» y «Guardar» (decidido por el usuario el 2026-09-17) |
| A2b | Tesorería · deudas | «Lo que debe Bree», «Lo que le deben a Bree» y «Saldadas» (plegado); «Nueva deuda o préstamo» y «Registrar pago» o «Registrar cobro» (decidido por el usuario el 2026-09-16) |
| A4 | Población | Habitantes (iniciales + cambios) y su evolución, cambios de población, consumo diario por recurso (los víveres usan la ración de la partida y no se editan aquí; la cerveza y la leña se consumen aparte, y la leña sale de la madera) y días de reserva |
| A5 | Personal · trabajadores | Plantilla por oficio: número, salario, frecuencia, edificio y coste mensual; cifras «Próximo pago» y «Coste al mes»; avisos de puestos sin cubrir y de trabajadores de más |
| A6 | Personal · guarnición | Unidades (nombre y tipo) con soldada y coste; cifras «Próximo pago» y «Coste al mes»; estado de las defensas |
| A6b | Personal · armería | Armas, armaduras y equipo de combate de la guarnición. Nombre, cantidad y valor por unidad los escribe el usuario (el valor, con campo de importe). Columna «Valor total» por fila (cantidad × valor por unidad, calculada y no editable) y valor total de la armería al pie; buscador; añadir, editar y eliminar |
| A7 | Producción · edificios | Estado, trabajadores asignados sobre necesarios y lista de producciones de cada edificio con modificadores activos: la columna «Produce» lista cada producción con la cantidad prevista de su próxima ocurrencia y la columna «Cada», su frecuencia, línea a línea; renta de los edificios alquilados en solo lectura |
| A7b ◆ | Editar edificio (sobre A7) | Nombre, tipo de edificio y trabajadores necesarios (con asignados y %); estado (segmentos); «Producción», con una fila por producto (recurso, cantidad base, frecuencia y quitar) y «Añadir producto»; resumen con la próxima ocurrencia de cada producto; «Eliminar», «Cancelar» y «Guardar cambios» (decidido por el usuario el 2026-09-17) |
| A8 | Producción · almacén | Reservas de víveres, madera, piedra, arcilla, hierro, cerveza y lana: existencias sobre capacidad, entradas y salidas a 30 días, previsión con la reserva debajo, «Añadir víveres» y «Añadir existencias» |
| A8b ◆ | Añadir víveres (sobre A8) | Comprar o recibir sin coste; «Por personas» (personas × duración × periodo) o «Sacos»; mercado y fecha; «Precio por saco» (campo de importe); coste, caja, almacén y días con falta de víveres resultantes |
| A9 | Producción · obras | Obras en curso (coste, materiales, fechas, progreso, efecto al terminar), programadas, planificadas y grupo plegado «Terminadas» |
| A9b ◆ | Nueva obra (sobre A9) | Resultado y su segundo campo, nombre, materiales (recurso, cantidad y disponibilidad), coste (campo de importe), inicio y duración; coste, caja y efecto resultantes; «Guardar como planificada» o «Empezar obra». Muestra el selector de recurso abierto con buscador |
| A12 | Animales | Lista de animales del asentamiento: animal (tipo del catálogo), grupo, cantidad, género (hembra, macho o grupo mixto) y valor por cabeza (opcional, campo de importe); totales por género y valor total anotado; filtros por tipo y género con buscador; añadir, editar y eliminar |
| A12b ◆ | Añadir animales (sobre A12) | Animal (selector con buscador sobre el catálogo de 57 tipos, con «Nuevo tipo de animal»), cantidad, género, valor por cabeza (opcional) y notas. Si ya existe el mismo animal con el mismo género, la cantidad se suma a esa fila |
| A10 | Comercio | Caravanas en ruta, grupo plegado «Historial de caravanas», precios por mercado y días de viaje |
| A10b ◆ | Nueva caravana (sobre A10) | Compra, venta o traslado; mercado (o asentamiento de destino), recurso, cantidad, precio por unidad y salida; importe, caja resultante, capacidad el día de llegada y efecto sobre las faltas previstas |
| A10c ◆ | Nuevo mercado (sobre A10b) | Alta completa (6.6, patrón 3): nombre, días de viaje desde cada asentamiento, precio del recurso de la caravana y otros precios; resumen de cómo quedará la caravana |
| A11 | Eventos narrativos | Activos, próximos y pasados con efectos; detalle del seleccionado; «Terminar hoy» |
| A11b ◆ | Nuevo evento (sobre A11) | Nombre, inicio, duración, efectos (ámbito, objetivo, porcentaje) y notas |

**Detalle**:

- **A0**: crea la fila de víveres (0 sacos, sin capacidad = sin límite) y el mercado local sin precios (Mercado.localDe), con el nombre del asentamiento, que cambia con él y no se elimina. Es estructura, no plantilla. Tras crear se abre el Resumen del asentamiento.
- **A1**:
  - Balance **−11,5 mo** con el subtítulo «entran 44 · salen 55,4» (39,2571 + 4,7 − 18 − 12,4286 − 25 ≈ −11,4714; en mh, 4.395.714 − 5.542.857 = −1.147.143, es decir −11,47143 mo). Los +4,7 mo son los impuestos de locales al mes con la producción habitual (decidido por el usuario el 2026-09-17).
  - Caja con el subtítulo «debe 30 mo al Gremio».
  - Botón «Transferir» (antes «Transferir con Tharan»), que abre J2f.
  - Almacén crítico: víveres «Se agota el 23 de abril» en ámbar; cerveza «Unos 105 días»; madera «Unos 85 días».
- **A2**:
  - Categorías del catálogo en el ejemplo: Soldadas, Rentas y alquileres, Aranceles, Impuestos, Obras y Transferencias.
  - «Obra: nuevo granero» y «Transferencia a Tharan» son vinculados.
- **A2b** (decidido por el usuario el 2026-09-16):
  - Es como J4. «Registrar pago» abre J4b con «Sale de: caja de Bree».
  - Las deudas de un asentamiento no aparecen en J4 ni en el patrimonio de Tharan. Aquí van también los impagos del asentamiento.
  - Nota de impagos: «Si la caja no llega para salarios, soldadas, tributos o pagos programados, el impago se anota aquí como deuda con «Trabajadores de Bree», «Guarnición de Bree», el destinatario del tributo o, si no lo tiene, el concepto del pago.»
  - Ejemplo: Bree debe 30 mo al Gremio de mercaderes de Bree, «Adelanto para el granero · 30 mo · sin interés · vence el 1 de junio», tomado el 28 de marzo (su movimiento de +30 mo está en el libro de marzo).
  - Nadie le debe dinero a Bree: estado vacío.
  - Saldadas: 1, «Barnabás Mantecona, posadero · préstamo de 10 mo · saldado el 2 de marzo».
- **A3**:
  - Columna Base también en los tributos. Destinatario solo en los tributos.
  - Frecuencias con el formato del selector («Cada día», «Mensual · día 1»).
  - Base «Fija» o «Por habitante» (n.º 26).
  - La renta de un edificio alquilado es un ingreso de esta tabla con el edificio enlazado (ImpuestoRenta con edificioId).
  - Segmentos «Ingresos y tributos · Locales comerciales» en la cabecera, a la derecha (decidido por el usuario el 2026-09-17).
  - En la tabla de ingresos, fila «Impuestos de locales comerciales» · Base «Por local» · «Mensual · día 1» · «4 locales» · «+4,7 mo». Al final lleva un icono de flecha que abre «Locales comerciales» (A3b), no el editar.
    - Si algún local está cerrado, la fila dice «N abiertos · M cerrados» en lugar de «4 locales».
    - Con tipos de distinto día de cobro, la frecuencia dice «Mensual · días 1 y 15».
  - La fila «Alquiler del molino» va en una sola línea.
  - No hay fila de cifras (decidido por el usuario el 2026-09-17):
    - La cabecera del panel Ingresos lleva «+44 mo al mes» (39,2571 + 4,7 = 43,9571), junto a «Añadir ingreso».
    - La cabecera del panel Tributos lleva «−25 mo al mes».
    - Debajo va la nota «Resultado fiscal: +19 mo al mes (ingresos menos tributos, sin salarios ni guarnición).» (43,9571 − 25 = 18,9571).
- **A3b** (artboard BreeLocales; decidido por el usuario el 2026-09-17):
  - Impuestos y rentas con el segmento «Locales comerciales».
  - Son negocios de terceros del asentamiento, que pagan impuestos a la caja. Su producción es dinero y no entra en el almacén. No son los edificios de Producción.
  - Panel «Locales» con «Añadir local»: una fila por local, con el nombre y debajo «tipo · titular»; Habitual; Abril (el valor, con «habitual» o «anotada»); «Impuesto» (el de abril); editar. Fila Total.

    | Local | Titular y tipo | Habitual al mes | Abril | Impuesto |
    |---|---|---|---|---|
    | Herrería 1 | Hobart Brezal, herrero · Herrería | 10 mo | 10 mo, habitual | +1 mo |
    | Posada El Poney Pisador | Barnabás Mantecona, posadero · Posada | 40 mo | 40 mo, habitual | +3,2 mo |
    | Tienda de telas | sin titular · Tienda | 6 mo | 1,5 mo, anotada («Vendió poco con las lluvias») | +0,1 mo, el mínimo (5 % de 1,5 = 0,075) |
    | Ultramarinos del camino | sin titular · Tienda | 4 mo | 4 mo, habitual | +0,2 mo |
    | **Total** | | **60 mo** | **55,5 mo** | **+4,5 mo** (se cobra el 1 de mayo) |

  - A la derecha, panel «Tipos de local» con el botón «Añadir»: una fila por tipo, con el nombre y debajo su regla, y editar. Todos cobran el día 1 de cada mes.

    | Tipo | Impuesto | Mínimo al mes | Locales |
    |---|---|---|---|
    | Herrería | 10 % de lo producido | 2 mp | 1 |
    | Posada | 8 % | 5 mp | 1 |
    | Tienda | 5 % | 1 mp | 2 |

    - Ejemplo de la regla bajo el nombre: «10 % · mínimo 2 mp · día 1».
  - Cifra «Cobro del 1 de mayo **+4,5 mo**», con «Al mes con la producción habitual: +4,7 mo» (1 + 3,2 + 0,3 + 0,2).
  - Con tipos de distinto día de cobro (no en el ejemplo):
    - La cifra muestra el próximo cobro: su fecha y el total de los locales que cobran ese día. Debajo, «y el 15 de mayo: +X mo».
    - El Total de la tabla dice «se cobra el 1 y el 15 de mayo».
    - La fila de A3 dice «Mensual · días 1 y 15».
  - Nota: «Impuesto = el mayor entre el % del tipo sobre lo producido en el mes y el mínimo. Se cobra el día del tipo por el mes anterior; sin anotar, cuenta la producción habitual. Toca la producción de abril para anotar lo que produjo de verdad.»
  - Tocar la producción de abril de un local abre A3c. Editar un local abre el formulario «Local comercial»; editar un tipo, el formulario «Tipo de local» (6.4).
  - Un local cerrado todo el mes no paga ese mes. Si estuvo Abierto algún día del mes, paga el mes entero, sin prorratear (sección 7).
- **A3c** (artboard BreeProduccionLocal; decidido por el usuario el 2026-09-17):
  - Diálogo de 620 px sobre A3b.
  - Título «Producción de abril»; subtítulo «Herrería 1 · Hobart Brezal, herrero · habitual 10 mo».
  - Mes «Abril de 1640» (n.º 40). Ofrece los meses sin cobrar del local: desde cobradoHasta + 1 (nunca antes del mes de su alta) hasta el mes actual, con el actual primero. No hay meses futuros.
  - Producción del mes: campo de importe 1 · Oro · mo = 1 mo, con la ayuda «Déjalo vacío para usar la habitual (10 mo). Si no produjo nada, anota 0.»
  - Nota «Cerrada dos semanas por la boda de su hija».
  - Resumen: «10 % de 1 mo» → «0,1 mo»; «Mínimo de las herrerías» → «0,2 mo (2 mp)»; «Se cobra el 1 de mayo» → «+0,2 mo».
    - Si el local estuvo cerrado todo ese mes, el resumen dice «Cerrado todo el mes: no paga».
  - Pie: «Usar la habitual» a la izquierda; «Cancelar» y «Guardar».
  - Ejemplo del usuario: Herrería 1 produce 10 mo → 10 % = 1 mo, que supera el mínimo de 2 mp. Si en abril se anota 1 mo o 0 → 0,1 mo o 0, por debajo del mínimo → paga 2 mp = 0,2 mo.
- **A4**:
  - Consumo con los decimales guardados: cerveza 0,003 por habitante = 3,72 barriles al día; leña 0,008 = 9,92 haces al día. Se muestran «3,7» y «9,9».
  - «Consumo por habitante»: «Nombre del consumo» (Leña), «Descuenta de» (Madera) y cantidad.
  - Días de reserva: víveres 11 (se agotan el 23 de abril, en ámbar); cerveza unos 105 días; madera (leña) unos 85 días.
- **A5**:
  - Cifras «Próximo pago» (4,2 mo · viernes 13 de abril) y «Coste al mes».
  - Frecuencia completa por fila («Semanal · viernes»).
  - Aviso del ejemplo, de puesto sin cubrir: «La cantera tiene 2 de 3 canteros y produce al 67 %.» con el enlace «Contratar cantero».
  - La sobredotación es un aviso ámbar sin artboard. Ejemplo hipotético con 4 canteros: «La cantera tiene 1 cantero de más».
  - Oficio con su plural cuando el número es mayor que 1.
  - Contratar el mismo oficio para el mismo edificio y con el mismo salario suma a la fila.
- **A6**:
  - Unidades con nombre y, debajo en 13 px, el tipo: «Guardias de la puerta» / Guardia; «Arqueros de la empalizada» / Arquero; «Capitán de la guardia» / Capitán.
  - «Añadir defensa» va en la cabecera del panel Defensas.
- **A6b y A12**: comprar o vender equipo de la armería o animales se anota aparte con «Nuevo movimiento» en A2 (categoría Comercio), y la cantidad se corrige editando la fila (propuesta aceptada por el usuario el 2026-09-17).
- **A7**:
  - Columna «Produce»: cada producción del edificio con la cantidad prevista de su próxima ocurrencia. Columna «Cada»: su frecuencia, línea a línea.
  - Ejemplo: la **Cantera** produce dos cosas:
    - Piedra: 25 carretadas semanal, el sábado → con 2 de 3 canteros, «17 carretadas de piedra».
    - Arcilla: 10 carretadas mensual, el día 1 → «7 carretadas de arcilla».
    - Debajo: «25 y 10 con 3 canteros».
  - Nota bajo la tabla: «Cada cantidad es la prevista para la próxima vez, en proporción a los días del periodo según trabajadores, estado y eventos.»
  - Una ocurrencia de 0 se muestra como «Nada: inactivo» (o dañado, alquilado o sin trabajadores).
  - Si la primera ocurrencia de una producción cae a más de 366 días, fuera del horizonte de la previsión, se muestra solo su fecha, sin cantidad prevista (criterio por defecto del 2026-09-17; revisable).
  - Editar un edificio abre A7b.
  - El molino muestra «Renta de 5 mo», en solo lectura. Debajo, el enlace «en Impuestos y rentas» abre A3.
  - Un edificio creado por una obra nace Inactivo, sin producción y con 0 trabajadores necesarios, con aviso ámbar (sección 7).
- **A7b** (artboard BreeEditarEdificio; decidido por el usuario el 2026-09-17):
  - Diálogo de 740 px sobre A7, con el subtítulo «Bree · Cantera · 2 de 3 canteros».
  - Primera fila: Nombre «Cantera», Tipo de edificio «Cantera» y Trabajadores necesarios «3», con la ayuda «2 canteros asignados · 67 %».
  - Estado con segmentos Activo · Dañado · Inactivo · Alquilado.
  - Producción: una fila por producto (Recurso, Cantidad base, Frecuencia y quitar). Filas: Piedra · 25 carretadas · Semanal · sábado; Arcilla · 10 carretadas · Mensual · día 1. Debajo, «Añadir producto».
  - Resumen: «Próxima piedra: sábado 14 de abril · unas 17 carretadas» y «Próxima arcilla: 1 de mayo · unas 7 carretadas».
    - Simula el formulario como si se guardara hoy, con las reglas de edición (sección 7).
    - Si la próxima ocurrencia no cabe entera en el almacén, añade en ámbar «caben N».
    - Si la primera ocurrencia de un producto cae a más de 366 días, fuera del horizonte de la previsión, muestra solo su fecha, sin cantidad prevista ni «caben N» (criterio por defecto del 2026-09-17; revisable).
  - Nota: «Cada producto se suma en su fecha, en proporción a los días del periodo con trabajadores y eventos.»
  - Pie: «Eliminar» a la izquierda; «Cancelar» y «Guardar cambios».
  - Con «Alquilado» se oculta Producción y se ve la renta en solo lectura, con el enlace «en Impuestos y rentas» (anotación del canvas).
    - Sin renta enlazada: «Sin renta · Añádela en Impuestos y rentas».
    - Las producciones y su acumulado se conservan ocultos. La siguiente ocurrencia suma lo acumulado hasta el día del cambio y las siguientes producen 0. Al volver a Activo reaparecen como estaban.
  - Quitar una producción: la fila se marca como quitada y el resumen dice «Se descartan 11 días acumulados de arcilla»; se confirma con «Guardar cambios» (6.4, «Eliminar»).
- **A8**:
  - La previsión es la simulación del motor sobre los 30 días siguientes (del 13 de abril al 12 de mayo). Usa el consumo realmente servido.
  - Entradas = lo que entra de verdad; debajo, «se pierden N» si la simulación pierde algo por capacidad.
  - Víveres a 30 días: entradas +714, salidas −975 (debajo, «faltan 265 sacos»), falta del 23 al 25 de abril y del 7 al 11 de mayo; el 12 de mayo quedan **49 sacos**. El consumo teórico sigue siendo 41,33 sacos al día (1.240 en 30 días).
  - Resto de datos a 30 días: Madera +175 −298 → **297 haces**; Piedra +83 → **263 carretadas**; Arcilla +7 → **157 carretadas** (150 + 6,67 el 1 de mayo); Cerveza +100 −112 → **78 barriles**; Lana +60 → **95 fardos**.
  - La columna «Dentro de 30 días» lleva debajo la reserva («Reserva: unos 85 días», «Sin consumo»).
  - Un recurso nuevo se crea con «Nuevo recurso» desde el selector de «Añadir existencias» (6.6).
  - Las compras y las recepciones sin coste se guardan como EntradaAlmacén (se editan desde su diálogo de origen); los ajustes con motivo, como AjusteExistencias. Los dos se listan en el formulario del recurso.
  - «Añadir existencias» con un mercado que no es el local crea una caravana.
- **A8b**: arriba, el segmento «Por personas · Sacos»; con «Sacos» se escribe directamente la cantidad. La etiqueta del precio toma la unidad del recurso: con víveres, «Precio por saco». Con otro mercado, el botón pasa a «Enviar caravana». Periodo sigue como desplegable (excepción de 6.5).
- **A9**: estado de insuficiencia: el material sin existencias sale en lacre («Faltan 20 carretadas de cal») y «Empezar obra» se desactiva; queda «Guardar como planificada». Si falta dinero, se aplica la regla de saldo negativo (6.4).
- **A9b**:
  - Fila 1: Resultado «Construir edificio» y Tipo de edificio «Horno». Fila 2: Nombre «Horno comunal», con la ayuda «También será el nombre del edificio», y Empieza «12 de abril de 1640 T.E. · 15 días», con la ayuda «Termina el 26 de abril».
  - Panel del selector de Arcilla: 400 px, buscador vacío con «21 recursos». Grupo «EN EL ALMACÉN DE BREE»: Arcilla 150 carretadas (marcada), Cerveza 90 barriles, Hierro 64 lingotes y Lana 35 fardos, con un degradado al pie. Pie «+ Nuevo recurso». Grupos del selector: «En el almacén de Bree · Catálogo».
  - Resumen: «Se paga al empezar −35 mo · la caja queda en 305,6 mo» y «Edificio «Horno comunal» (Horno), inactivo hasta que lo actives en Edificios».
- **A10**:
  - La historia de caravanas es un grupo plegado «Historial de caravanas» bajo el panel «Caravanas en ruta».
  - En la tabla de precios, el editar está en la fila «Días de viaje desde Bree», uno por mercado, y abre «Mercado y precios» con «Eliminar». Las filas de recurso no tienen editar.
  - Con 5 mercados o más, la tabla se desplaza en horizontal, con la columna Recurso fija y el mercado local primero.
- **A10b**:
  - El precio llega precargado con el del mercado y es editable. Su etiqueta toma la unidad del recurso: con víveres, «Precio por saco». El pie lleva la casilla «Guardar como precio de Fornost».
  - Ayuda de Cantidad con Fornost: «Caben 1.148 más el día de llegada».
  - Sin mercado elegido, la ayuda dice «Hoy caben 890 sacos más» y el pie no tiene la casilla «Guardar como precio de …» hasta elegir mercado.
  - Vender en el mercado local es una caravana con 0 días: se cobra y los recursos salen al momento.
  - **Traslado**: elige asentamiento de destino, días de viaje entre ambos (se guardan como Ruta entre asentamientos), carga y salida. Los recursos salen del almacén al salir y entran en el destino al llegar. No mueve dinero. Solo aparece con 2 o más asentamientos (propuesta aceptada por el usuario el 2026-09-17).
- **A10c** (artboard BreeNuevoMercado):
  - Capas: A10 con velo; «Nueva caravana» de 720 px (Compra, Mercado sin valor, Víveres, 100 sacos con la ayuda «Hoy caben 890 sacos más», salida 12 de abril de 1640 T.E., pie sin la casilla «Guardar como precio de …»); segundo velo; diálogo «Nuevo mercado» de 680 px en y = 24, de ≈676 px, sin foco ni teclado. Asoman 20 px de «Nueva caravana» por cada lado.
  - Subtítulo «Para «Nueva caravana» de Bree: se elegirá al crearlo.»
  - Nombre «Cavada Grande» (ayuda «Complétalo si hace falta»); Días de viaje desde Bree «5» (ayuda «Solo ida: sale hoy y vuelve el 22 de abril»); desde Archet vacío, «Sin ruta» (ayuda «Opcional: sin días, Archet no verá este mercado»).
  - «Precios en Cavada Grande»: «Víveres · saco de 30 kg», 28 · Bronce · mb = 0,28 mo, con la ayuda «Obligatorio: lo necesita la caravana» y el botón «+ Añadir precio».
  - Resumen: «La caravana de 100 sacos» → «−28 mo · la caja queda en 312,6 mo»; «Vuelve» → «22 de abril, antes de la falta de víveres del 23».
- **A11**:
  - «Terminar hoy» solo aparece en eventos activos. Fija el último día en hoy sin recalcular lo ya aplicado.
  - Objetivo de un efecto: todos, un edificio, un recurso, una categoría de coste o un impuesto (n.º 29).
- **A11b**: Ámbito del efecto sigue como desplegable (excepción de 6.5).
- **A12 y A12b**:
  - Al sumar a una fila existente, A12b muestra «Se sumarán 6 a tus 24 vacas» y pide con segmentos qué valor por cabeza queda: mantener, sustituir o media ponderada. Las notas se unen.
  - Editar una fila hacia un tipo y género que ya existen ofrece unir las dos filas.
  - Panel del selector de A12b: 400 px, buscador «cabr» con «3 de 57» y pie «+ Nuevo tipo de animal “cabr”».

### 6.4 Formularios que siguen un patrón ya diseñado

No tienen artboard propio, salvo «Edificio», que se dibuja en A7b, y «Producción del mes», que se dibuja en A3c: usan el diálogo estándar (cabecera, campos en dos columnas, resumen del efecto y pie con acciones) y los componentes de J2b, J2c, J3b y A9b. Los formularios de registros admiten editar y eliminar.

| Formulario | Se abre desde | Campos | Selectores (ver 6.5) |
|---|---|---|---|
| Añadir evento o pago | Calendario | Elige entre evento narrativo y pago o cobro programado (abre J2b con fecha futura). El evento puede ser de la partida (nombre, inicio, duración y notas, sin efectos) o de un asentamiento (abre A11b). Evento de partida (propuesta aceptada por el usuario el 2026-09-17) | Dominio, Fecha |
| Avanzar días «Otro…» | P4 | Número de días (de 1 a 366, aviso ámbar si pasa de 90) o fecha de destino. No se puede pasar del 31 de diciembre de 9999: error «No se puede avanzar más allá del 31 de diciembre de 9999» bajo el campo de días (decidido por el usuario el 2026-09-17) | Fecha |
| Editar partida | P0 | Nombre; fecha inicial y Edad (segmentos), editables mientras no haya ningún avance; «Eliminar partida» (J2d) | Mes, Fecha |
| Equivalencias (P1) | P1, «Editar equivalencias» | La tabla de P6 editable en el propio paso: enteros ≥ 2 y, combinadas, 1 mm no puede valer más de 1.000.000.000 mh (100 veces lo normal), para que los saldos guardados en hierro sigan siendo enteros exactos; si se pasa: «Con estas equivalencias, 1 mithril vale demasiado hierro (más de 1.000.000.000 mh); reduce alguna equivalencia» (decidido por el usuario el 2026-09-17), con vista del resultado. Fijas después de crear la partida | — |
| Editar personaje | J1 | Nombre y descripción | — |
| Objeto | J3 | Nombre, cantidad, valor unitario (importe), ubicación y notas. Si es el objeto de un pergamino, la cantidad es 1 | Ubicación, Moneda |
| Deuda o préstamo | J4, A2b | Sentido (debo / me deben, segmentos), contraparte, fecha de alta, principal (importe), «El dinero entra en / sale de» (con «Ninguno: solo anotar la deuda»), interés % y su frecuencia, vencimiento y notas. Lista «Pagos» (fecha, importe y editar, que abre J4b con «Eliminar») | Contraparte, Dominio, Frecuencia, Fecha, Moneda |
| Registrar cobro | J4, A2b | Como J4b con «Entra en» | Dominio, Fecha, Moneda |
| Gasto e ingreso recurrente | J5 | Gasto o ingreso (segmentos), concepto, importe, categoría, «Sale de» o «Entra en», frecuencia, fecha del primer cobro («Primera vez», fecha de inicio o fecha de «Una sola vez», según la frecuencia: campo de frecuencia) y activo. Ingreso (propuesta aceptada por el usuario el 2026-09-17) | Categoría, Dominio, Frecuencia, Fecha, Moneda |
| Inversión | J6 | Negocio, descripción, capital (importe), «El capital sale de» (con «Ninguno: ya invertido»), participación %, beneficio (importe) y frecuencia, «Primer cobro» («Primera vez», fecha de inicio o fecha de «Una sola vez», según la frecuencia: campo de frecuencia) y «Los beneficios entran en». El campo se llamaba «próxima fecha»; la próxima fecha calculada se ve en J6 (decidido por el usuario el 2026-09-17) | Negocio, Dominio, Frecuencia, Fecha, Moneda |
| Retirar inversión | J6 | Importe recuperado (importe), entra en y fecha. Se revierte editando la inversión | Dominio, Fecha, Moneda |
| Hechizo | J7 («Añadir hechizo» y editar); alta rápida «Nuevo hechizo» desde J8 y «Pergamino» (6.6) | Nombre (obligatorio, de 2 a 60 caracteres y único entre los hechizos del personaje; el duplicado añade «Si es de otra lista, añádela al nombre: «Luz (Caminos de la luz)».»); lista (texto libre, opcional); reino (segmentos opcionales: Sin reino · Esencia · Canalización · Mentalismo · Híbrido); nivel (entero opcional de 1 a 50); estado (segmentos En estudio · Aprendido); «Aprendido el» (obligatorio con «Aprendido», no posterior a hoy ni anterior al último intento: «El último intento es del 10 de febrero»; se borra al volver a «En estudio»); notas; «Eliminar» (J2d). «Aprendido» solo lo marca el jugador, cuando lo decida el máster. Sustituye a «Lista de hechizos» y a «Marcar como aprendida» (decidido por el usuario el 2026-09-17) | Reino, Fecha |
| Pergamino | J7 | Hechizo (opcional; selector con altas; su reino se muestra como dato). Con hechizo, el nombre del pergamino se copia del hechizo. Sin hechizo, pide «Nombre del pergamino» (de 2 a 60 caracteres), y el pergamino sale en «Otros» en J8 sin crear un hechizo en estudio. Nivel (opcional), estado (poseído, consumido, perdido o vendido; a mano solo se elige entre poseído y perdido: «vendido» lo pone J3b y «consumido» lo pone J8), valor (importe) y ubicación; crea el objeto «Pergamino «X»» en el inventario. Consumir o perder el pergamino archiva su objeto (fuera del patrimonio, como los «Vendido»). Casilla «Lo he comprado», con «Sale de» y fecha: crea el movimiento vinculado de «Pergaminos y estudio». Se consume desde J8 (decidido por el usuario el 2026-09-17) | Hechizo, Ubicación, Dominio, Fecha, Moneda |
| Editar asentamiento | A1 | Nombre, tipo (segmentos), caja inicial (importe) y habitantes iniciales; «Eliminar asentamiento» (J2d) | Moneda |
| Nuevo movimiento de caja | A2 | J2b con la caja del asentamiento como origen o destino | Categoría, Dominio, Fecha, Moneda |
| Transferencia | J2b («Transferencia»), A1 y A2 («Transferir») | J2f: «Sale de» y «Entra en» distintos, categoría fija «Transferencias», concepto propuesto, importe, fecha y los dos saldos resultantes | Dominio, Fecha, Moneda |
| Ingreso o tributo | A3 | Concepto, base (fija o por habitante), importe (por habitante: importe × habitantes el día del cobro), frecuencia, primer cobro o pago («Primera vez», fecha de inicio o fecha de «Una sola vez», según la frecuencia: campo de frecuencia) y destinatario (solo en tributos). La renta de un edificio alquilado guarda el edificio | Base del impuesto, Frecuencia, Fecha, Destinatario, Edificio, Moneda |
| Local comercial | A3b («Añadir local» y editar) | Nombre, tipo, titular (opcional, de «Personas y entidades»), producción habitual al mes (importe de 0 o más, con decimales: «La producción no puede ser negativa»), estado (segmentos Abierto · Cerrado) y notas; «Eliminar» (J2d). El cambio de estado cuenta desde el día siguiente a la fecha actual. Un local cerrado todo el mes no paga ese mes; si estuvo Abierto algún día, paga el mes entero (decidido por el usuario el 2026-09-17) | Tipo de local, Titular, Moneda |
| Tipo de local | A3b («Añadir» y editar); alta completa desde el selector Tipo de local | Nombre; impuesto % (de 0 a 100, con hasta 2 decimales); mínimo al mes (importe, 0 o más); día de cobro (de 1 a 31; si no existe en el mes, el último día); «Eliminar» (J2d), bloqueado mientras tenga locales. Todos los locales del tipo usan su regla. Si el tipo tiene locales, avisa: «Vale desde el próximo cobro (1 de mayo), también para la producción de abril» (decidido por el usuario el 2026-09-17) | Moneda |
| Producción del mes (artboard A3c) | A3b (producción del mes de un local) | Mes; producción del mes (importe de 0 o más, con decimales: «La producción no puede ser negativa»; vacío = la habitual; 0 = no produjo, así que paga el mínimo); nota; resumen con el % del tipo, el mínimo y lo que se cobra («Cerrado todo el mes: no paga» si el local estuvo cerrado todo ese mes); «Usar la habitual». Solo los meses sin cobrar del local: desde cobradoHasta + 1 (nunca antes del mes de su alta) hasta el mes actual, con el actual primero y sin meses futuros (decidido por el usuario el 2026-09-17) | Mes de producción, Moneda |
| Cambio de población | A4 | Fecha, cantidad (+/−) y motivo | Fecha |
| Consumo por habitante | A4 | Nombre del consumo (por ejemplo Leña), «Descuenta de» (recurso del almacén, excepto víveres; por ejemplo Madera) y cantidad por habitante al día (hasta 4 decimales) | Recurso |
| Contratar trabajadores | A5 | Oficio, número, salario (importe), frecuencia, primer pago («Primera vez», fecha de inicio o fecha de «Una sola vez», según la frecuencia: campo de frecuencia) y edificio | Oficio, Frecuencia, Fecha, Edificio, Moneda |
| Unidad de guarnición | A6 | Tipo, nombre (obligatorio), número, soldada (importe), frecuencia y primer pago («Primera vez», fecha de inicio o fecha de «Una sola vez», según la frecuencia: campo de frecuencia) | Tipo de unidad, Frecuencia, Fecha, Moneda |
| Objeto de la armería | A6b | Nombre (texto libre), cantidad y valor por unidad (importe) | Moneda |
| Defensa | A6 | Tipo, nombre y estado (segmentos) | Tipo de defensa |
| Edificio (artboard A7b) | A7 | Nombre, tipo, trabajadores necesarios (con asignados y %) y estado (segmentos). Lista «Producción»: una fila por producto con recurso, cantidad base y frecuencia, y quitar; «Añadir producto»; resumen de la próxima ocurrencia de cada una (si la primera cae a más de 366 días, solo su fecha, sin cantidad prevista: criterio por defecto del 2026-09-17; revisable). Con «Alquilado» se oculta Producción (se conserva oculta) y se ve la renta en solo lectura, con el enlace «en Impuestos y rentas» (decidido por el usuario el 2026-09-17). Validación de cada producción: recurso y frecuencia obligatorios; cantidad base mayor que 0, con hasta 2 decimales. Un recurso puede repetirse con otra frecuencia, pero no con la misma («Ya produce piedra semanal: cambia su cantidad»). La frecuencia no ofrece «Una sola vez»: una entrada única se anota con «Añadir existencias» › Recibir sin coste. Límites de N, «Primera vez» y fecha de inicio: los del campo de frecuencia, iguales en todos los formularios (decidido por el usuario el 2026-09-17). La ocurrencia teórica anterior es la primera vez menos un periodo y no mira la fecha de inicio | Tipo de edificio, Recurso, Frecuencia |
| Recurso y ajuste de existencias | A8 | Recurso (sin altas), unidad en solo lectura con el enlace «Cambiar en Listas y catálogos», existencias y capacidad; el ajuste pide motivo. Lista de ajustes y recepciones sin coste | Recurso |
| Recurso del catálogo | P7 («Añadir recurso» y editar); alta completa desde el selector de Recurso | Nombre, unidad en singular y plural y, según el origen, existencias, capacidad y precio (6.6) | — |
| Añadir existencias | A8 | Comprar o recibir sin coste; recurso (con «Nuevo recurso»); cantidad (no puede superar la capacidad: «Caben 890 sacos más»); mercado (otro mercado crea una caravana) y fecha; precio por unidad (importe); coste, caja y existencias resultantes. En modo edición cambia también su movimiento vinculado | Recurso, Mercado, Fecha, Moneda |
| Editar obra o empezar planificada | A9 | Como A9b; en una obra en curso solo cambia lo pendiente. Edita también su movimiento de coste | Resultado de obra, Tipo de edificio, Tipo de defensa, Edificio, Defensa, Recurso, Fecha, Moneda |
| Mercado y precios | A10 (editar en la fila «Días de viaje desde …»); alta completa A10c | Nombre, días de viaje (solo ida) desde cada asentamiento y precio por recurso (importe); «Eliminar» | Recurso, Moneda |
| Editar caravana | A10 | Como A10b; solo cambia lo pendiente. Edita también su pago o cobro vinculado | Mercado, Destino del traslado, Recurso, Fecha, Moneda |
| Confirmaciones | P0 (importar una partida que ya existe: «Reemplazar» o «Importar como copia»), P5 (deshacer avance), P6 (importar copia, borrar partida), P7 (cambiar la unidad de un recurso) | Explican qué se pierde y ofrecen la acción en rojo; las de borrado usan la doble confirmación de J2d | — |

**Añadir, editar y eliminar** (decidido por el usuario el 2026-09-15). Todas las tablas y listas de registros permiten las tres operaciones, en el personaje, en los asentamientos y en la partida:

- **Añadir**: botón en la cabecera de la pantalla o del panel.
- **Editar**: botón al final de cada fila o tarjeta. Abre el mismo formulario de alta con los datos cargados.
- **Eliminar**: dentro del formulario de edición, con **doble confirmación** (decidido por el usuario el 2026-09-16). El botón «Eliminar» abre el diálogo J2d, que explica qué se borra y qué cambia y exige marcar una casilla antes de activar «Eliminar definitivamente». Vale para todas las tablas, del personaje y de los asentamientos.
  - **Excepción a J2d: quitar una producción.** En A7b la fila se marca como quitada, el resumen dice «Se descartan 11 días acumulados de arcilla» y el cambio se confirma con «Guardar cambios»; «Cancelar» la recupera. No borra movimientos ni existencias (propuesta aceptada por el usuario el 2026-09-17).
- **Al guardar** se recalculan saldos, patrimonio, previsiones y conteos.
- **Registros en marcha**: editar una caravana en ruta o una obra en curso cambia lo pendiente, no lo ya aplicado. Lo cobrado o pagado se corrige desde su origen si es un movimiento vinculado, o con J2c si lo creó una regla recurrente.

| Vista | Tabla o lista | Añadir | Editar y eliminar |
|---|---|---|---|
| P0 | Partidas | «Nueva partida», «Importar copia» | Editar en cada tarjeta («Editar partida», con eliminar partida) |
| P3 | Detalle del día | «Añadir evento o pago» | Editar en cada elemento: abre su registro, su regla o su origen (detalle de P3) |
| P7 | Listas y catálogos | «Añadir …» (alta rápida sin origen; en Recursos, «Recurso del catálogo») | Editar por fila, con «Eliminar» y reasignación (P7b) |
| Menú | Dominios | «Añadir asentamiento» | «Editar» en el resumen del personaje o del asentamiento (eliminar asentamiento) |
| J2 | Movimientos | «Nuevo movimiento» | Editar por fila (J2c, con «Eliminar»); los vinculados abren su origen; el saldo inicial se edita sin «Eliminar» |
| J2 | Programados | «Nuevo movimiento» con fecha futura | Editar por fila (J2c) |
| J3 | Objetos | «Añadir objeto» | Editar por fila; «Vender» (J3b) |
| J4 | Deudas y préstamos | «Nueva deuda o préstamo»; «Registrar pago» o «Registrar cobro» | Editar por tarjeta; el formulario lista los pagos, cada uno editable y eliminable |
| J5 | Gastos e ingresos recurrentes | «Añadir gasto o ingreso» | Editar por fila; interruptor «Activo / En pausa» en línea |
| J5 | Últimos cobros | Se crean al avanzar días | Editar por fila (J2c) |
| J6 | Inversiones | «Nueva inversión» | «Editar» por tarjeta; «Retirar inversión» |
| J6 | Historial de beneficios | Se crean al avanzar días | Editar por fila (J2c) |
| J7 | Hechizos | «Añadir hechizo» | Editar por fila (formulario «Hechizo», con «Eliminar»; ahí se marca «Aprendido») |
| J7 | Historial de intentos | «Registrar intento» | Editar por fila (J8, con «Eliminar») |
| J7 | Pergaminos | «Añadir» | Editar por fila; «Ver en el inventario» |
| A2 | Movimientos de la caja | «Nuevo movimiento», «Transferir» | Editar por fila; los vinculados abren su origen; el saldo inicial se edita sin «Eliminar» |
| A2 | Programados | «Nuevo movimiento» con fecha futura | Editar por fila (J2c) |
| A2b | Deudas del asentamiento | «Nueva deuda o préstamo»; «Registrar pago» o «Registrar cobro» | Editar por tarjeta; el formulario lista los pagos |
| A3 | Ingresos y tributos | «Añadir ingreso», «Añadir tributo» | Editar por fila; la fila «Impuestos de locales comerciales» no se edita aquí: su icono de flecha abre A3b |
| A3b | Locales comerciales | «Añadir local» | Editar por fila (formulario «Local comercial», con «Eliminar»); la producción del mes abre A3c |
| A3b | Tipos de local | «Añadir» | Editar por fila (formulario «Tipo de local», con «Eliminar», bloqueado mientras tenga locales) |
| A4 | Consumo diario | «Añadir consumo» | Editar por fila, salvo la de víveres (sale de la ración) |
| A4 | Cambios de población | «Registrar cambio» | Editar por fila |
| A5 | Plantilla | «Contratar» | Editar por fila |
| A6 | Unidades | «Añadir unidad» | Editar por fila |
| A6 | Defensas | «Añadir defensa» (cabecera del panel) | Editar por fila |
| A6b | Armería | «Añadir a la armería» | Editar por fila |
| A7 | Edificios | «Añadir edificio» | Editar por fila (A7b, con «Eliminar») |
| A7b | Producciones del edificio | «Añadir producto», dentro del formulario del edificio | Se editan en su fila y se quitan con quitar, dentro del formulario del edificio |
| A8 | Existencias | «Añadir víveres», «Añadir existencias» | Editar por fila (el ajuste pide motivo) |
| A9 | Obras en curso, programadas, planificadas y terminadas | «Nueva obra» | Editar por tarjeta y por fila; «Empezar obra» |
| A10 | Caravanas en ruta e historial | «Nueva caravana» | Editar por fila |
| A10 | Precios por mercado | «Añadir mercado» | Editar en la fila «Días de viaje desde …», uno por mercado |
| A11 | Eventos | «Nuevo evento» | Editar por fila y en el detalle; «Terminar hoy» |
| A12 | Animales | «Añadir animales» | Editar por fila |

**No son editables, por diseño:**
- **Lo que se calcula a partir de otros registros:**
  - Inicio: avisos, tarjetas y próximos 7 días.
  - Resúmenes del personaje y del asentamiento, patrimonio y próximos 30 días.
  - Vista previa y resumen de «Avanzar días».
  - Previsión a 30 días.
  - Avisos previstos del calendario.
- **Las equivalencias de monedas**, que se fijan al crear la partida, **y la ración de víveres**, que es fija: 1 saco de 30 kg por persona durante 30 días (propuesta aceptada por el usuario el 2026-09-17). Confirmado por el usuario el 2026-09-15: no se pueden cambiar después.

Los asentamientos se crean vacíos, sin plantillas (decidido por el usuario el 2026-09-16): todo su contenido se añade con los formularios anteriores.

**Movimientos vinculados** (decidido por el usuario el 2026-09-16). Un movimiento vinculado sale de otro registro. El libro muestra ese registro en la columna Origen, con badge oro e icono («Transferencia», «Venta», «Pago de deuda», «Obra», «Caravana», «Compra de víveres»…). Su botón editar abre el formulario del origen, no J2c.

| Origen | Movimientos | Se editan y eliminan desde |
|---|---|---|
| Transferencia | Dos (sale y entra) | J2f, desde cualquiera de los dos; eliminar borra los dos |
| Venta de objeto | Ingreso | J3b con los datos cargados y «Eliminar» (devuelve las unidades) |
| Pago o cobro de deuda | Uno por pago | Formulario de la deuda › Pagos › J4b con «Eliminar»; recalcula el capital y los intereses pendientes; los devengos ya sumados no cambian |
| Alta de préstamo con dinero | Uno | Formulario de la deuda |
| Capital y retirada de una inversión | Uno cada uno | Formulario de la inversión o «Retirar inversión» |
| Coste de una obra | Uno al empezar | Editar obra |
| Caravana | Pago al salir o cobro al volver | Editar caravana |
| Compra de víveres o existencias | Uno | A8b o «Añadir existencias» en modo edición |
| Compra de pergamino | Uno | Formulario «Pergamino» |

- Los movimientos automáticos de reglas recurrentes (salarios, soldadas, tributos, impuestos, impuestos de locales, gastos e ingresos recurrentes, beneficios) no son vinculados. Cada ocurrencia se edita suelta con J2c y la regla no cambia.
- Anotar la producción de un mes ya cobrado no recalcula el cobro de los locales: se corrige su movimiento con J2c (decidido por el usuario el 2026-09-17).
- Un movimiento manual con «Añadir también al inventario» tampoco es vinculado. El objeto guarda movimientoCompraId y J2d del movimiento ofrece la casilla «Quitar también las 3 athelas del inventario».
- **Programados**: el saldo solo suma los movimientos no programados. J2 y A2 muestran un grupo «Programados» encima del libro, con badge «Programado», editables con J2c. El filtro de periodo añade «Próximos». Al aplicarse pasan a programado = false y guardan el avanceId.
- **Saldo inicial**: primera fila del libro (J2 y A2), editable con campo de importe y sin «Eliminar». «Editar asentamiento» incluye la caja inicial y los habitantes iniciales.

**Al eliminar**. J2d lista siempre qué se borra y qué cambia.

| Registro | Regla |
|---|---|
| Movimiento suelto | Se borra y se recalcula el saldo |
| Transferencia | Se borran los dos lados |
| Venta | Se borra su movimiento y vuelven las unidades (si el objeto estaba archivado como «Vendido», se restaura). Si el objeto es de un pergamino, el pergamino vuelve a «poseído» |
| Objeto | Sus ventas conservan nombre y valor; si es de un pergamino, se borra también el pergamino |
| Deuda | Se borran sus pagos y los movimientos de esos pagos y de su alta |
| Pago o cobro de deuda | Se borra su movimiento; se recalculan el capital y los intereses pendientes (los devengos no cambian) |
| Inversión | Se borran los movimientos de capital y retirada; los beneficios cobrados se conservan sueltos, sin regla ni inversiónId |
| Gasto o ingreso recurrente, trabajador, unidad, impuesto | Sus movimientos pasados se conservan sueltos, sin regla |
| Tipo de local | Bloqueado mientras tenga locales («Herrería tiene 1 local: cámbialo de tipo antes») |
| Local comercial | Se borran sus producciones anotadas. Los cobros pasados no cambian y su detalle conserva el nombre del local, sin localId |
| Obra en curso | Casillas marcadas por defecto: «Devolver 85 mo a la caja» (borra su movimiento) y «Devolver los materiales al almacén» |
| Obra terminada | Su efecto no se deshace; su movimiento se conserva sin vínculo |
| Caravana en ruta | Casillas: devolver el pago (compra) o la carga (venta o traslado) |
| Caravana terminada | Sus movimientos se conservan sin vínculo |
| Edificio | Sus trabajadores quedan sin edificio (aviso en A5); se quitan los efectos de eventos que lo apuntan; se borran sus producciones y lo acumulado, sin sumar nada al almacén (J2d lo lista: «Se pierden 11 días acumulados de arcilla y 5 de piedra»); se bloquea si tiene una obra de mejora o de reparación pendiente; su renta se conserva sin edificio |
| Producción de un edificio | Excepción a J2d: en A7b la fila se marca como quitada, el resumen dice «Se descartan 11 días acumulados de arcilla» y el cambio se confirma con «Guardar cambios»; «Cancelar» la recupera. Se descarta lo acumulado del periodo (sección 7). No borra movimientos ni existencias (propuesta aceptada por el usuario el 2026-09-17) |
| Fila del almacén | Solo con 0 existencias y sin producción (también la oculta de un edificio alquilado), consumo, obras pendientes ni caravanas en ruta; el bloqueo nombra el edificio («La cantera (alquilada) produce arcilla»); la de víveres no se elimina |
| Compra o recepción de víveres o existencias | Se borra su movimiento y salen sus unidades del almacén; se bloquea si las existencias quedarían por debajo de 0 |
| Mercado | Bloqueado con caravanas en ruta; borra precios y rutas; el local no se elimina |
| Evento | Se quitan sus efectos futuros; lo aplicado no se recalcula. J2d añade «Lo acumulado hasta hoy en las producciones no cambia» |
| Cambio de población | Se recalculan los habitantes |
| Hechizo | Se borran sus intentos. Sus pergaminos se conservan, sin hechizo, con su nombre y su fecha de consumo, y sus objetos siguen en el inventario (decidido por el usuario el 2026-09-17) |
| Intento | Se borra y se recalcula el conteo del hechizo; si consumió un pergamino, este vuelve a «poseído» y su objeto se restaura. Lo mismo al desmarcar «El pergamino se consume» o al cambiar de pergamino en J8 (decidido por el usuario el 2026-09-17) |
| Pergamino | Se borran su objeto del inventario y su movimiento de compra. Si se usó en un intento, el intento dice «con un pergamino eliminado» |
| Opción de catálogo o lista | Reasignación con P7b (6.6, patrón 5) |
| Asentamiento | Se borra todo lo suyo (caja, movimientos, registros, deudas, mercado local y rutas). La otra parte de sus transferencias se conserva como ingreso o gasto «Transferencia (Bree eliminado)», sin vínculo. Los traslados en ruta hacia él se cancelan y la carga vuelve a su origen. Los objetos de Tharan en «Caja de Bree» o «Almacén de Bree» pasan a «Encima». Después se vuelve a Inicio |
| Partida | Se borra todo y se vuelve a P0 |

**Saldo negativo en acciones manuales** (decidido por el usuario el 2026-09-16):

- Si una acción manual deja una bolsa o caja por debajo de 0, en su fecha o en cualquier fecha posterior (contando los programados), se permite con aviso.
- El resumen del diálogo muestra el saldo en lacre con icono.
- Al pulsar el botón principal, el pie pasa a confirmación: texto en lacre «La bolsa quedará en −3,482 mo» y los botones «Revisar» y «Guardar igualmente». El verbo cambia con la acción («Transferir igualmente»).
- Inicio muestra el aviso rojo «La bolsa de Tharan está en negativo: −3,482 mo» hasta que vuelva a 0 o más.
- El motor de avance nunca deja una caja en negativo (sección 9).
- Lo que no puede quedar negativo son las existencias y las unidades: materiales de obra, carga de una caravana de venta o traslado y unidades vendidas. Se validan y bloquean.

**Patrones transversales**:

- **Validación**:
  - Mensaje en lacre con icono bajo el campo.
  - El botón principal se desactiva mientras haya errores, salvo el saldo negativo, que pide confirmación.
  - Reglas por campo: obligatorio, mínimo, máximo y fechas permitidas.
  - Ejemplos: vender más de lo que tienes, cantidad 0, fecha de intento futura, capacidad superada («Caben 890 sacos más»).
- **Cerrar con cambios**: el pie pasa a «Hay cambios sin guardar», con «Seguir editando» y «Descartar».
- **Estados vacíos**: frase breve y botón de alta centrado. Los paneles de resumen dicen «Nada en curso». Las cifras se muestran a 0.
- **Desplazamiento**:
  - El contenido principal se desplaza en vertical con la cabecera de pantalla fija.
  - Los libros (J2 y A2) se cargan por meses.
  - P0 muestra el buscador con más de 5 partidas.
- **Pantalla y teclado**:
  - Tamaño mínimo 1024×700. Orientación horizontal bloqueada.
  - Los diálogos tienen un alto máximo igual al alto visible menos 48 px, con el cuerpo desplazable.
  - Al abrir el teclado, el campo con el foco se lleva a la vista.
- **Selector de fecha** (n.º 3): panel bajo el campo, con mes y año elegibles; atajos relativos a la fecha de la partida (Hoy, Mañana, +7 días); días fuera de rango atenuados; admite escribir la fecha («19/04/1640»). Los atajos no ofrecen fechas posteriores al 31 de diciembre de 9999 (criterio por defecto del 2026-09-17; revisable).
- **Campo de frecuencia** (n.º 13): compuesto, como el campo de importe. Tipo y, según el tipo, N, día de la semana (segmentos), día del mes, mes y fecha. Muestra la próxima fecha, que se calcula y no se guarda (sección 8).
  - Funciona igual en todos los formularios que lo usan, no solo en la producción (decidido por el usuario el 2026-09-17):
    - Cada N días (N de 2 a 366), Cada dos semanas, Cada N meses (N de 2 a 12) y Trimestral añaden «Primera vez». En Cada N días y Cada dos semanas, su valor inicial es la fecha actual + N días o + 14 días.
    - En Cada N meses y Trimestral, al elegir o cambiar el día del mes (o N), «Primera vez» se recalcula: el día elegido del mes de «fecha actual + N meses» (+ 3 meses en Trimestral); del 29 al 31, el último día si ese mes no lo tiene (decidido por el usuario el 2026-09-17).
      - Ejemplo: el 12 de abril de 1640, «Cada 2 meses · día 15» → 15 de junio de 1640; «Cada 2 meses · día 31» → 30 de junio de 1640.
      - Si se cambia a mano, debe caer en ese día. Si no, error bajo el campo: «La primera vez debe caer el día 15 del mes» y, con los días 29 a 31, «La primera vez debe caer el día 31 del mes o, si no lo tiene, el último».
    - **Valor inicial en Cada N meses y Trimestral**: al elegir el tipo, el día del mes empieza con el día de la fecha actual. Así, «Primera vez» empieza en ese día del mes de «fecha actual + N meses» (+ 3 meses en Trimestral; el último día si ese mes no lo tiene). «Primera vez» también se recalcula al cambiar de tipo (por ejemplo, de Trimestral a Cada N meses), conservando el día del mes elegido. Nunca queda vacía (criterio por defecto del 2026-09-17; revisable).
      - Ejemplo: el 12 de abril de 1640, al elegir Trimestral, el día del mes es el 12 y la primera vez, el 12 de julio de 1640. Al pasar a Cada N meses con N = 2, el día sigue en 12 y la primera vez pasa al 12 de junio de 1640. El 31 de enero de 1640, al elegir Trimestral, el día es el 31 y la primera vez, el 30 de abril de 1640.
    - Cada día, Semanal, Mensual y Anual añaden la fecha de inicio, opcional («no antes de», sección 4).
    - Una sola vez pide su fecha, posterior a la fecha actual (criterio por defecto del 2026-09-17; revisable).
    - En Anual, el día debe existir en el mes en algún año: «Abril no tiene 31 días»; el 29 de febrero se admite (sección 4).
  - **Posterior a la fecha actual**: «Primera vez» y la fecha de inicio deben ser posteriores a la fecha actual. Se comprueba solo en el formulario, y solo al crear la regla o al cambiar su frecuencia (tipo, N, día, mes, «Primera vez» o fecha de inicio). Editar otros campos de una regla antigua cuya primera vez ya pasó no lo vuelve a comprobar (decidido por el usuario el 2026-09-17).
    - La fecha de «Una sola vez» también debe ser posterior a la fecha actual, en todos los formularios con frecuencia, también en los de dinero. Tiene el mismo control: solo en el formulario, y solo al crear la regla o al cambiar su frecuencia o esa fecha. Editar otros campos de una regla cuya fecha ya pasó no lo vuelve a comprobar (criterio por defecto del 2026-09-17; revisable).
  - **Formularios de dinero con la fecha del primer pago o cobro** («Gasto e ingreso recurrente», «Ingreso o tributo», «Contratar trabajadores», «Unidad de guarnición» e «Inversión», cuyo campo se llama «Primer cobro»): ese único campo, con la etiqueta de cada formulario, es la «Primera vez» en Cada N días, Cada dos semanas, Cada N meses y Trimestral, y la fecha de inicio (opcional) en Cada día, Semanal, Mensual y Anual. El campo de frecuencia no añade otra (decidido por el usuario el 2026-09-17).
    - Con Una sola vez, ese mismo campo, con su etiqueta, es la fecha de «Una sola vez». Sigue habiendo un solo campo de fecha: el campo de frecuencia no muestra otra (decidido por el usuario el 2026-09-17). Debe ser posterior a la fecha actual, con el mismo control que en el resto de formularios (criterio por defecto del 2026-09-17; revisable).
    - En Cada N meses y Trimestral, ese campo es la «Primera vez»: se recalcula al elegir o cambiar el día del mes (o N) y, si se cambia a mano, debe caer en ese día, con los mismos errores (decidido por el usuario el 2026-09-17). Su valor inicial y el recálculo al cambiar de tipo son los de arriba, así que nunca queda vacío (criterio por defecto del 2026-09-17; revisable).
    - Ejemplo: el 12 de abril de 1640 se contratan trabajadores con salario «Semanal · viernes» y primer pago el 20 de abril. El primer pago es el viernes 20, no el 13.
- **Multiselección** (n.º 5): casillas por opción; «Todos» excluye a las demás; dominios y tipos se combinan con Y; botón «Listo» en el pie; el campo resume la elección («Bree · 2 tipos»).
- **Buscador de tabla** (J2, A2, J3, A6b, A12): la lupa sustituye a los filtros en la cabecera del panel. Busca en las columnas de texto y en el dato secundario con la misma normalización que los selectores. Se combina con los filtros.
- **Interruptores en línea** (J5): guardan al instante y cuentan como edición.

### 6.5 Selectores con buscador

Decidido por el usuario el 2026-09-15: los desplegables pueden tener muchas opciones y, al abrirse, muestran un buscador.

**Ámbito de las listas**: los catálogos (categorías, oficios, tipos de edificio, de unidad, de defensa y de animal, y recursos) son de la app y se comparten entre partidas. Ubicaciones y «Personas y entidades» son de cada partida. La copia JSON lleva las opciones que usan sus registros (propuesta aceptada por el usuario el 2026-09-17).

**Comportamiento común** (componente único, diseñado en J2c, A9b y A12b):

- **Panel**: al tocar el campo se abre un panel bajo él, de 400 px como mínimo. Si el campo está en la columna derecha, el panel se alinea con el borde derecho del campo.
- **Buscador**: campo de 48 px arriba del panel. Con más de 12 opciones recibe el foco y sale el teclado. Con 12 o menos se ve sin foco, y el teclado solo sale si se toca.
- **Contador en el buscador**: a la derecha, antes de la x, en 13 px y color suave. Sin búsqueda muestra el total («27 categorías»). Con búsqueda, el número de coincidencias («5 de 27»). Que la lista sigue se indica con un degradado al pie de la lista.
- **Búsqueda**: sin distinguir mayúsculas ni tildes, en cualquier parte del texto y también en el dato secundario (buscar «180» encuentra «Piedra · 180 carretadas»).
- Resalta el texto que coincide, agrupa las opciones por categoría y marca la opción actual. Las etiquetas de grupo van en 13 px.
- Sin búsqueda, arriba aparece el grupo «Recientes», con hasta 5 opciones elegidas al guardar otros registros. Si no hay, no sale el grupo (por eso A9b no lo muestra).
- Filas de 44 px y desplazamiento dentro del panel a partir de 8 filas.
- Sin resultados: «Nada coincide con “…”» y, debajo, «Busca en todas las categorías y grupos.».
- **Pie fijo**: si la lista admite altas, el pie lleva la acción de alta (6.6, patrón 1), en lugar de una última fila.
- **Alto con teclado**: con el teclado abierto, el panel mide como mucho el alto visible bajo el campo menos 8 px. Si ese espacio baja de 220 px, el diálogo de origen sube hasta que el campo quede a 88 px o menos del borde superior, y vuelve a su sitio al cerrarse el panel. Buscador y pie quedan fijos y la lista se desplaza dentro.
  - Los artboards J2c, A9b y A12b dibujan el panel con el teclado cerrado para enseñar la lista. Con teclado, el diálogo sube hasta dejar el campo a 88 px del borde.
- Las opciones creadas por el usuario llevan la marca «tuya» (13 px, color suave) junto a su detalle.
- **Modo filtro** (J2 y A2 «Todas las categorías», J3 «Todas las ubicaciones», A12 «Todos los tipos» y los demás filtros): primera opción «Todas» o «Todos», sin altas ni pie, solo opciones con datos y su número de registros.
- **Segmentos**: las elecciones fijas de 2 a 4 opciones excluyentes no son desplegables sino segmentos: Edad; gasto, ingreso o transferencia; gasto o ingreso (J5); comprar o recibir; compra, venta o traslado; «Por personas» o «Sacos»; debo o me deben; «Se aplica a»; bueno o malo; aldea, pueblo o ciudad; estado de un hechizo; estado de un local comercial (Abierto · Cerrado); estado de edificio y de defensa; género del animal. El reino de un hechizo también va en segmentos, aunque tiene 5 opciones con «Sin reino» (decidido por el usuario el 2026-09-17).
  - **Excepción**: en filas repetibles o con poco ancho siguen como desplegables: Ámbito del efecto (A11b) y Periodo de víveres (A8b).

**Catálogo** (opciones iniciales; las listas que admiten altas crecen con el uso). En la columna Altas, «rápida», «completa» y «en el campo» remiten a los patrones de 6.6.

| # | Selector | Dónde | Opciones | Grupos | Altas |
|---|---|---|---|---|---|
| 1 | Moneda | Todo campo de importe | Mithril (mm), Oro (mo), Plata (mp), Bronce (mb), Cobre (mc), Estaño (me), Hierro (mh), cada una con su valor en oro | — | No |
| 2 | Mes | Fecha inicial de la partida | Enero a diciembre | — | No |
| 3 | Fecha | Movimientos, caravanas, obras, eventos, intentos, compras, cambios, primeros pagos y fechas del campo de frecuencia («Primera vez», fecha de inicio y «Una sola vez») | Calendario mensual; admite escribir la fecha («19/04/1640») y atajos Hoy, Mañana, +7 días, que no ofrecen fechas posteriores al 31 de diciembre de 9999 (criterio por defecto del 2026-09-17; revisable) (componente en 6.4) | — | — |
| 4 | Periodo del libro | Filtros de J2 y A2 | Todas las fechas, Próximos, Hoy, Últimos 7 días, Últimos 30 días, Último avance («del 12 al 19»), cada mes con movimientos, cada año, Rango personalizado | Rápidos · Meses · Años | No |
| 5 | Dominios y tipos | Filtro del calendario | Todos; Tharan y cada asentamiento; pagos, cobros, eventos, producción, obras, caravanas, deudas, estudio, avisos (multiselección, componente en 6.4) | Dominios · Tipos | No |
| 6 | Categoría de movimiento | J2, J2b, J2c, A2, «Gasto e ingreso recurrente» (J5) | 27 de la app. Gastos del personaje (10): Alojamiento, Comida y bebida, Montura, Equipo, Armas y armaduras, Hierbas y curación, Pergaminos y estudio, Viajes y peajes, Sobornos y regalos, Gastos recurrentes. Ingresos del personaje (4): Recompensas, Venta de objetos, Beneficios de inversiones, Préstamos y deudas. Asentamientos (9): Impuestos, Rentas y alquileres, Aranceles, Salarios, Soldadas, Tributos, Obras, Comercio, Víveres del almacén. Otros (4): Transferencias, Inversiones, Ajustes, Otros. «Inversiones» es para el capital de una inversión (propuesta aceptada por el usuario el 2026-09-17). Los cobros de los impuestos de locales usan «Impuestos» | Gastos del personaje · Ingresos del personaje · Asentamientos · Otros · Tus categorías | Sí · rápida, a «Tus categorías». Las tuyas pueden cambiar de grupo en P7 |
| 7 | Dominio (sale de / entra en) | J2b, J2c, J2f, J3b, J4b, deudas, inversiones, J5, pergamino comprado, «Añadir evento o pago» | Bolsa de Tharan; caja de cada asentamiento, con su saldo. En deudas añade «Ninguno: solo anotar la deuda»; en el capital de una inversión, «Ninguno: ya invertido». En una transferencia, «Sale de» y «Entra en» no pueden ser el mismo. En «Añadir evento o pago» con «Evento», añade primero «Partida (sin efectos)» (propuesta aceptada por el usuario el 2026-09-17) | Personaje · Asentamientos | No |
| 8 | Ubicación | J3 (filtro y formulario), pergaminos | Todas y Vendidos (solo en el filtro); Encima; Caja de cada asentamiento; Almacén de cada asentamiento; ubicaciones propias (Posada El Poney Pisador, Establo de Bree…), cada una con su número de objetos | Contigo · Asentamientos · Otras | Sí · rápida, a «Otras». No en el filtro |
| 9 | Contraparte | «Deuda o préstamo» (J4, A2b). «Registrar cobro» la toma de la deuda | Lista «Personas y entidades» de la partida, compartida con los n.º 10, 27 y 39, con su saldo pendiente (Gremio de mercaderes de Bree, Hobart Brezal, herrero, Dalen, mercader de Esgaroth…) | Con deudas abiertas · Todas | Sí · rápida |
| 10 | Comprador | J3b (opcional) | Lista «Personas y entidades» | Recientes · Todos | Sí · rápida |
| 11 | Aplicar pago a | J4b, cobros | Segmentos: Intereses y capital (por defecto) · Solo capital · Solo intereses | — | No |
| 12 | Negocio | «Inversión» (J6) | Negocios existentes (El Tonel Dorado, Barcaza del Brandivino…) | Activos · Retirados | Sí · en el campo |
| 13 | Frecuencia | Gastos e ingresos recurrentes, salarios, soldadas, impuestos, inversiones, producción (cada fila de «Producción» en «Edificio», A7b), intereses | Cada día, Cada N días, Semanal (día), Cada dos semanas, Mensual (día), Cada N meses, Trimestral, Anual, Una sola vez (campo compuesto en 6.4). En todos los formularios que lo usan (decidido por el usuario el 2026-09-17): Cada N días de 2 a 366 y Cada N meses de 2 a 12; con Cada N días, Cada dos semanas, Cada N meses y Trimestral añade «Primera vez» (fecha posterior a la fecha actual; valor inicial en Cada N días y Cada dos semanas: fecha actual + N días o + 14 días); en Cada N meses y Trimestral, al elegir o cambiar el día del mes (o N), «Primera vez» se recalcula al día elegido del mes de fecha actual + N meses o + 3 meses (del 29 al 31, el último día si ese mes no lo tiene) y, si se cambia a mano, debe caer en ese día: «La primera vez debe caer el día 15 del mes» (decidido por el usuario el 2026-09-17); en Cada N meses y Trimestral, al elegir el tipo, el día del mes empieza con el de la fecha actual, y «Primera vez» se recalcula también al cambiar de tipo, conservando el día del mes elegido, así que nunca queda vacía (criterio por defecto del 2026-09-17; revisable); con Cada día, Semanal, Mensual y Anual añade la fecha de inicio, opcional y posterior a la fecha actual; con Una sola vez, su fecha, posterior a la fecha actual (criterio por defecto del 2026-09-17; revisable). Lo posterior a la fecha actual solo se comprueba en el formulario, al crear la regla o al cambiar su frecuencia. En los formularios de dinero, la fecha del primer pago o cobro hace de «Primera vez», de fecha de inicio o, con Una sola vez, de fecha de «Una sola vez» (6.4) (decidido por el usuario el 2026-09-17). En producción: sin «Una sola vez» (una entrada única se anota con «Añadir existencias» › Recibir sin coste); la ocurrencia teórica anterior es la primera vez menos un periodo y no mira la fecha de inicio | Habituales · Personalizadas | No |
| 14 | Hechizo | J8 y formulario «Pergamino» (opcional) | Hechizos del personaje con su detalle (lista, reino y nivel) y su estado. J8 solo ofrece los hechizos «En estudio»; al editar un intento, también su hechizo aunque esté Aprendido (grupo Aprendidos, solo esa opción) (decidido por el usuario el 2026-09-17) | En estudio · Aprendidos | Sí · rápida |
| 15 | Reino | Solo el formulario «Hechizo» | Segmentos opcionales: Sin reino, Esencia, Canalización, Mentalismo, Híbrido. El formulario «Pergamino» lo muestra como dato del hechizo | — | No |
| 16 | Pergamino usado | J8 | Ninguno; pergaminos poseídos del hechizo elegido; resto de pergaminos poseídos, también los que no tienen hechizo. Al editar un intento, también el pergamino que consumió ese intento | De este hechizo · Otros | No |
| 17 | Mercado | A8b y «Añadir existencias» (con «Comprar»), A10b y «Editar caravana» (antes de salir) | Mercado local de cada asentamiento; mercados creados (Fornost, Tharbad…) con días de viaje y precio del recurso elegido | Local · Otros mercados | Sí · completa (A10c) |
| 18 | Recurso | Materiales de A9b y «Editar obra»; A10b y «Editar caravana»; «Añadir existencias»; «Recurso y ajuste de existencias»; «Consumo por habitante» («Descuenta de»); cada fila de «Producción» en «Edificio» (A7b); precios de «Mercado y precios»; «Ampliar almacén» en A9b | Recursos del asentamiento con existencias (Víveres, Madera, Piedra, Arcilla, Hierro, Cerveza, Lana…) y catálogo: Sal, Carbón, Leña, Cuero, Tela, Herramientas, Armas, Vino, Pescado, Carne, Hierbas, Cera, Vidrio, Oro en bruto (21 en el ejemplo). Los efectos de eventos usan el n.º 29 | En el almacén de Bree · Catálogo | Sí · completa. Sin altas en A10b en venta (solo «En el almacén de Bree»), en «Recurso y ajuste de existencias», en «Ampliar almacén» y en «Mercado y precios» apilado |
| 19 | Resultado de obra | A9b | Construir edificio, Mejorar edificio, Ampliar almacén, Construir defensa, Reparar defensa, Reparar edificio. Al elegir aparece un segundo campo: Construir edificio → Tipo de edificio (n.º 20, con altas); Construir defensa → Tipo de defensa (n.º 24, con altas); Mejorar edificio → Edificio (n.º 21); Ampliar almacén → Recurso y capacidad añadida; Reparar defensa → Defensa (n.º 37); Reparar edificio → Edificio (dañados). Estos cuatro últimos, sin altas | Por tipo de resultado | No |
| 20 | Tipo de edificio | «Edificio»; A9b con «Construir edificio» | Granja, Huerto, Redil, Establo, Molino, Horno, Panadería, Cervecería, Aserradero, Cantera, Mina, Herrería, Carpintería, Telar, Curtiduría, Alfarería, Granero, Almacén, Mercado, Posada, Taberna, Santuario, Casa del concejo, Muelle | Alimentos · Materias primas · Artesanía · Almacenaje · Servicios | Sí · rápida con grupo |
| 21 | Edificio | Trabajadores, efectos de eventos, obras de mejora y de reparación, ingresos por renta | Edificios del asentamiento con estado y trabajadores | Activos · Dañados o inactivos | No |
| 22 | Oficio | Contratar | Granjero, Hortelano, Pastor, Pescador, Cazador, Leñador, Cantero, Minero, Molinero, Panadero, Cervecero, Herrero, Carpintero, Albañil, Tejedor, Curtidor, Alfarero, Posadero, Mercader, Carretero, Criado, Escriba, Sanador. Cada oficio guarda su plural | Campo · Materias primas · Oficios · Servicios | Sí · rápida con grupo y plural |
| 23 | Tipo de unidad | Unidad de guarnición | Guardia, Arquero, Lancero, Jinete, Explorador, Milicia, Sargento, Capitán. El nombre propio («Guardias de la puerta») va en la unidad | Tropa · Mandos | Sí · rápida con grupo |
| 24 | Tipo de defensa | «Defensa»; A9b con «Construir defensa» | Empalizada, Muralla, Puerta, Torre de vigía, Atalaya, Foso | — | Sí · rápida |
| 25 | Estado | Edificios y defensas | Segmentos. Edificio: Activo, Dañado, Inactivo, Alquilado. Defensa: Buena, Dañada, En ruinas | — | No |
| 26 | Base del impuesto | Impuestos | Fija; Por habitante (importe por habitante × habitantes el día del cobro). Se quita «Porcentaje de las ventas del mercado», porque la app no registra ventas del mercado local. Lo sustituye el impuesto de locales comerciales, que va por local en A3b; en A3 su fila muestra la base «Por local» (decidido por el usuario el 2026-09-17) | — | No |
| 27 | Destinatario | Tributos | Lista «Personas y entidades» (Corona de Arthedain…) | Recientes · Todos | Sí · rápida |
| 28 | Ámbito del efecto | A11b | Producción, Consumo, Costes, Ingresos (desplegable: excepción de los segmentos) | — | No |
| 29 | Objetivo del efecto | A11b | Según el ámbito: todos los edificios o uno (producción; un edificio afecta a todas sus producciones); recursos (consumo); salarios, soldadas, tributos o gastos (costes); cada impuesto o renta, salvo los locales comerciales (ingresos) | Por tipo | No |
| 30 | Periodo de víveres | A8b | Días, Semanas (7 días), Meses (30 días), Años (365 días) (desplegable: excepción de los segmentos) | — | No |
| 31 | Partida | P0 | Lista de partidas; con más de 5 aparece el buscador | — | — |
| 32 | Filtro de edificios, obras y caravanas | A7, A9, A10 (si hay muchos) | Estado y tipo | Por estado | No |
| 34 | Tipo de animal | A12 (filtro), A12b | **Bovino**: Vaca, Toro, Buey, Ternero, Ternera, Vaquilla. **Caballar**: Caballo de tiro, Caballo de silla, Caballo de guerra, Caballo de los Rohirrim, Yegua, Potro, Poni, Poni de la Comarca, Mula, Asno. **Ovino y caprino**: Oveja, Carnero, Cordero, Cabra, Macho cabrío, Cabrito. **Porcino**: Cerdo, Cerda, Verraco, Lechón. **Aves de corral**: Gallina, Gallo, Pollo, Capón, Pato, Oca, Pavo, Paloma, Codorniz, Faisán, Pavo real, Cisne. **Perros y gatos**: Perro pastor, Perro de caza, Mastín, Lebrel, Perro guardián, Gato. **Cetrería**: Halcón, Azor, Hurón. **Pequeños animales**: Conejo, Colmena de abejas, Gusanos de seda. **Carga exótica**: Camello, Olifante. **Estanques**: Carpa, Trucha. **En cercado**: Ciervo, Jabalí, Oso amaestrado. 57 tipos; cada opción muestra cuántos tiene ya el asentamiento | Por grupo | Sí · rápida con grupo. No en el filtro |
| 35 | Género del animal | A12b (segmentos), filtro de A12 | Hembra, Macho, Grupo mixto (confirmado por el usuario el 2026-09-15) | — | No |
| 36 | Destino del traslado | A10b y «Editar caravana» con «Traslado» | Los demás asentamientos de la partida, con los días de viaje si hay ruta (propuesta aceptada por el usuario el 2026-09-17) | — | No |
| 37 | Defensa | A9b y «Editar obra» con «Reparar defensa» | Defensas dañadas o en ruinas del asentamiento, con su estado | — | No |
| 38 | Tipo de local | Formulario «Local comercial» (A3b) | Tipos de local del asentamiento con su regla (Herrería «10 % · mínimo 2 mp · día 1», Posada, Tienda) (decidido por el usuario el 2026-09-17) | — | Sí · completa, con el formulario «Tipo de local» |
| 39 | Titular | Formulario «Local comercial» (A3b), opcional | Lista «Personas y entidades» (Hobart Brezal, herrero; Barnabás Mantecona, posadero…) (decidido por el usuario el 2026-09-17) | — | Sí · rápida |
| 40 | Mes de producción | Formulario «Producción del mes» (A3c) | Los meses sin cobrar del local: desde cobradoHasta + 1 (nunca antes del mes de su alta) hasta el mes actual, con el actual primero («Abril de 1640»). Sin meses futuros (decidido por el usuario el 2026-09-17) | — | No |

El n.º 33 («Categoría de gasto recurrente») se quita: el formulario de J5 usa el n.º 6.

### 6.6 Altas desde los desplegables

Cómo se crea una opción nueva desde un selector y dónde se gestiona después. Hay cinco patrones.

#### Patrón 1 · Acción de alta en el pie del buscador

- **Dónde**: en los selectores con altas que están dentro de un formulario de alta o edición (J2b, J2c, J3b, J8, A8b, A9b, A10b, A12b y los formularios de 6.4).
- **Dónde no**:
  - En los filtros de las listas: una opción creada para filtrar daría una lista vacía.
  - En los selectores de un diálogo de alta ya apilado, para no abrir un tercer nivel.
- **Pie**: fila de 44 px a lo ancho, con fondo papel y filete arriba. Solo lleva la acción, con icono +.
  - Sin búsqueda: «Nueva categoría».
  - Con búsqueda: «Nueva categoría “posada”». El texto se corta a 16 caracteres con «…».
  - Con resultados, la acción es un enlace en oro oscuro alineado a la izquierda.
  - Sin resultados, la lista dice «Nada coincide con “posada”» y «Busca en todas las categorías y grupos.», y la acción pasa a botón principal de 44 px con 8 px de margen a cada lado.
  - Si una opción coincide exactamente con la búsqueda (sin mayúsculas, tildes ni espacios dobles), no hay acción: el pie dice «“Alojamiento” ya existe» y la opción sale resaltada.
    - En J8, si coincide exactamente con un hechizo Aprendido, que no sale en la lista, el pie dice «“Hablar con los animales” está aprendido», sin acción (decidido por el usuario el 2026-09-17).
- **Al tocar la acción**: el panel se cierra sin cambiar el valor del campo, se conserva todo lo escrito en el formulario y se abre el patrón que corresponda (2, 3 o 4).

#### Patrón 2 · Alta rápida

- **Cuándo**: opciones que solo necesitan un nombre y, como mucho, un grupo (y el plural en Oficio). Categorías, oficios, tipos de edificio, de unidad, de defensa y de animal, ubicaciones, «Personas y entidades» y hechizos. Un hechizo nuevo va a «En estudio»; su lista, reino y nivel se completan después en el formulario «Hechizo» (decidido por el usuario el 2026-09-17).
- **Posición**: diálogo de 600 px apilado sobre el formulario de origen, que se ve bajo un segundo velo (tinta al 35 %). Anclado a 24 px del borde superior y centrado. Alto máximo: alto visible menos 48 px, con cabecera y pie fijos y el cuerpo desplazable.
- **Medidas**: sin grupo mide ≈335 px y cabe sobre un teclado de 380 px. Con grupo mide ≈440 px y, con el teclado abierto, el cuerpo se desplaza ≈50 px. Al tocar Grupo, el Nombre pierde el foco y el teclado se cierra.
- **Cabecera**: título («Nueva categoría»), subtítulo «Para «Editar movimiento»: se elegirá al crearla.» y botón x de 44 px, que equivale a Cancelar.
- **Nombre**: trae el texto buscado sin espacios sobrantes y con la primera letra en mayúscula. Tiene el foco, el cursor al final y un contador («18 de 40»). Sin búsqueda, está vacío.
- **Grupo**: solo si la lista tiene grupos y el alta no va a un grupo fijo.
  - De 2 a 4 grupos (Oficio, Tipo de unidad): segmentos en una fila.
  - Con más (Tipo de edificio, 5; Tipo de animal, 11): selector con buscador, sin altas y sin foco.
  - Valor inicial: el grupo de la primera coincidencia de la búsqueda; si no la hubo, vacío; en Tipo de unidad, «Tropa».
  - Grupo fijo (categorías a «Tus categorías», ubicaciones a «Otras», hechizos a «En estudio»): no hay campo, solo una línea de 14 px («Irá a «Tus categorías» y la verás en todas tus partidas.»).
  - Oficio añade el campo Plural a la derecha del Nombre.
- **Validación al teclear**, en una línea bajo el nombre:
  - En bosque con icono check: «No hay otra categoría con este nombre.»
  - En lacre, si hay duplicado: «Ya existe «Alojamiento» en Gastos del personaje.». El botón principal pasa a «Elegir «Alojamiento»», que cierra el alta y deja esa opción elegida.
    - Excepción: en J8, un hechizo Aprendido no se puede elegir. La línea dice «Ya tienes «Hablar con los animales» aprendido: vuelve a ponerlo «En estudio» en su hechizo para registrar intentos.» y «Crear y elegir» queda desactivado (decidido por el usuario el 2026-09-17).
  - En ámbar, si hay nombres parecidos: «Parecida: «Salarios» (Asentamientos)» con el enlace «Elegir esa». Línea de 44 px. No bloquea.
- **Pie**: «Cancelar» y «Crear y elegir» (principal, icono check), desactivado hasta que todo es válido. Intro crea si todo es válido; si falta el grupo, Intro cierra el teclado y lleva al campo Grupo.
- **«Crear y elegir»**:
  - Guarda la opción en ese momento. Queda aunque luego se cancele el formulario de origen.
  - Vuelve al origen con la opción elegida y el borde del campo en oro durante 2 s.
  - Pone bajo el campo la ayuda «Categoría nueva · la gestionas en Listas y catálogos» y pasa el foco al siguiente campo vacío.
  - El formulario de origen sigue sin guardar.
- **«Cancelar»** vuelve al origen con el panel del selector abierto y la búsqueda intacta, sin preguntar. Tocar el velo no cierra el diálogo.
- **En P7** el mismo diálogo sirve para añadir sin origen (sin subtítulo, botón «Crear») y para editar («Editar categoría», línea «Se usa en 1 movimiento de Tharan», «Eliminar» a la izquierda del pie y «Guardar cambios»; en las categorías tuyas aparece además Grupo, con un selector de los 5 grupos).

#### Patrón 3 · Alta completa

- **Cuándo**: opciones que son registros con datos sin los que los cálculos no funcionan. Mercado (días de viaje y precios), Recurso (unidad y, según el origen, existencias, capacidad y precio) y Tipo de local (impuesto, mínimo al mes y día de cobro). Reutiliza los formularios «Mercado y precios», «Recurso del catálogo» y «Tipo de local». Lista de hechizos deja de ser alta completa: el hechizo es alta rápida (decidido por el usuario el 2026-09-17).
- **Posición**: apilado sobre el formulario de origen, con segundo velo y 40 px más estrecho, para que asomen 20 px del de abajo por cada lado. Mismo anclaje y alto máximo que el alta rápida.
- **Foco**: se abre sin foco, para que el teclado no tape los campos obligatorios ni el resumen. El Nombre trae la ayuda «Complétalo si hace falta».
- **Cabecera**: «Nuevo mercado», con el subtítulo «Para «Nueva caravana» de Bree: se elegirá al crearlo.».
- **Contenido**:
  - Llega relleno con el nombre buscado y el contexto del origen: asentamiento de la pantalla, recurso, cantidad y mercado ya elegidos.
  - Los campos que el origen necesita para calcular pasan a obligatorios y van primero (por ejemplo, el precio del recurso de la caravana).
  - Sus selectores no ofrecen altas.
  - Una caja de resumen enseña cómo quedará el origen («La caravana de 100 sacos −28 mo · la caja queda en 312,6 mo»).
- **Pie**: «Cancelar» y «Crear y elegir», activo cuando todo lo obligatorio es válido. Errores bajo cada campo. El nombre sigue las reglas del alta rápida; con duplicado, el botón pasa a «Elegir «X»».
- **«Crear y elegir»**: guarda el registro, que aparece ya en su pantalla; vuelve al origen con la opción elegida; recalcula lo que depende de ella (fecha de vuelta, importes, disponibilidad, caja resultante); pone la ayuda «Mercado nuevo · edítalo en Comercio».
  - Excepción de los recursos: el recurso del catálogo y su precio se guardan al momento, pero su fila del almacén se crea al guardar el formulario de origen, y solo si ese formulario usa el almacén del asentamiento (materiales de obra, entradas, caravanas, consumo o producción); desde «Mercado y precios» no se crea.
- **«Cancelar»**: si solo está lo que venía relleno, vuelve al origen con el panel abierto y la búsqueda intacta. Si se escribió algo más, el pie pasa a «Hay cambios sin guardar», con «Seguir editando» y «Descartar» (44 px).
- Con el teclado abierto, el campo con el foco se desplaza hasta quedar visible dentro del cuerpo.

#### Patrón 4 · Nombre nuevo en el campo

- **Cuándo**: solo en Negocio (n.º 12), dentro del formulario «Inversión». El negocio no existe fuera de su inversión y el formulario ya pide todo lo demás.
- Con una búsqueda de 2 a 60 caracteres que no coincide exactamente con un negocio, el pie ofrece «+ Nuevo negocio “molino de entibo”». Sin búsqueda dice «Escribe el nombre para crear uno».
- Al tocar la acción, el panel se cierra, el campo queda con «Molino de Entibo» y la etiqueta «nuevo», y el foco pasa a Descripción.
- No se guarda nada hasta «Guardar inversión». Si se cancela el formulario, el negocio no existe.
- Elegir un negocio retirado copia su descripción, que se puede cambiar.
- Elegir uno activo muestra el aviso ámbar «Ya tienes una inversión activa en «El Tonel Dorado». Para cambiar capital o participación, edítala.» con el enlace «Editar esa inversión». No impide guardar.
- Renombrar se hace editando la inversión en J6: cambia todas las inversiones con el mismo nombre normalizado y avisa «También cambia en 1 inversión retirada». El historial se lee por inversiónId y muestra el nombre nuevo; los conceptos de los movimientos ya registrados no cambian.

#### Patrón 5 · Gestión y reasignación en P7

- **Qué se gestiona en P7**: los catálogos de la app, iniciales y creados (categorías, oficios, tipos y recursos: nombre y unidad) y las listas de la partida (ubicaciones y «Personas y entidades»). Mercados, hechizos, negocios, tipos de local y existencias se gestionan en su pantalla.
- **Acceso**: P6 › panel «Listas y catálogos» › «Gestionar listas».
- **Añadir**: abre el alta rápida sin origen. En Recursos abre «Recurso del catálogo» (nombre y unidad en singular y plural, sin existencias). La fila nueva sale resaltada.
- **Editar**:
  - Renombrar cambia el nombre en todos los registros, porque guardan el id. En un catálogo de la app, llega a todas las partidas.
  - No se puede usar un nombre que ya existe. Para unir dos opciones, se elimina una y sus registros pasan a la otra.
  - Cambiar la unidad de un recurso pide confirmación: «Las cantidades no se convierten: 180 carretadas pasarán a ser 180 cargas».
- **Eliminar** abre P7b (J2d con el campo «Sus registros pasan a», un selector con buscador, sin altas y sin la opción que se borra):
  - Si algún registro necesita la opción, el campo es obligatorio y no tiene valor inicial.
  - Si el campo del registro es opcional (comprador, destinatario, titular), también lo es este, y su valor inicial es «Dejarlos sin nombre»; con un solo tipo de uso, el texto lo nombra («Dejarlas sin comprador», «Dejarlos sin destinatario», «Dejarlos sin titular»).
  - Si la opción no se usa, J2d se abre sin el campo.
  - La caja dice cuántos registros cambian, en qué dominios y partidas, y que los saldos no cambian («También cambian 3 movimientos de Los Senderos del Norte»).
  - Si hay registros del último avance, lleva el aviso oro «Si deshaces ese avance, el movimiento desaparece y la categoría sigue eliminada.»
  - «Eliminar definitivamente» se activa al elegir destino (si es obligatorio) y marcar «Sé que esto no se puede deshacer».
- **Reasignación**: se aplica a los registros actuales y al snapshotPrevio del último avance de cada partida afectada, para que «Deshacer avance» no la pierda. No rellena editadoEl.
- **Opciones de la app**: tienen id fijo («cat.alojamiento», «oficio.cantero»). Al eliminarlas quedan marcadas como borradas, para que una actualización del catálogo inicial no las reponga, y no se muestran en selectores ni en P7.
- **Bloqueos**: «Eliminar» sale desactivado con el motivo debajo.
  - Categorías que pone la app (Salarios, Soldadas, Tributos, Impuestos, Rentas y alquileres, Aranceles, Beneficios de inversiones, Préstamos y deudas, Venta de objetos, Víveres del almacén, Comercio, Obras, Transferencias, Inversiones, Pergaminos y estudio) y «Otros»: se renombran, pero no se eliminan («Salarios la pone la app al pagar a los trabajadores: puedes renombrarla, pero no eliminarla.»).
  - Víveres: ni se renombra ni se elimina.
  - Cerveza, Madera, Piedra y Arcilla, reservas del almacén: se renombran, pero no se eliminan.
  - Un recurso con existencias, producción, consumo (también si otro consumo descuenta de él, como la leña de la madera), obra pendiente o caravana en ruta, en cualquier partida: «Hierro tiene 64 lingotes en Bree: déjalo a 0 antes de eliminarlo.»
  - «Encima» y las cajas y almacenes de los asentamientos se ven en tono suave, sin editar, con «Sale del dominio».
- **Tipo de animal**: si en el destino ya hay una fila con el mismo tipo y género, las cantidades se suman y las notas se unen. P7b pide con segmentos qué valor por cabeza se queda («1 mo (Cabra) · 1,2 mo (Cabra montés)») y enseña la cuenta («Valor anotado de los animales: 486,8 → 485,6 mo»).

#### Reglas comunes del nombre

- Obligatorio. Vacío: «Escribe un nombre» en lacre al salir del campo y botón principal desactivado.
- Longitud: de 2 a 40 caracteres en categorías, oficios, tipos y recursos; de 2 a 60 en ubicaciones, personas y entidades, negocios, mercados y hechizos. Con 1: «Usa al menos 2 letras».
- Se compara sin mayúsculas, tildes, diéresis ni espacios dobles. La ñ no equivale a la n.
- **Duplicado** (bloquea): el nombre ya existe en la lista. En tipos y oficios, el plural de uno existente también cuenta («Graneros» frente a «Granero»).
- **Parecido** (no bloquea): coincide al quitar una -s o -es final, o uno contiene al otro con palabras enteras. En personas se compara también lo que va antes de la primera coma.
- **Reservados** por los filtros: «Todas», «Todos», «Todas las categorías», «Todas las ubicaciones» y «Todos los tipos» («Ese nombre lo usa el filtro»).

#### Las 17 altas

13 rápidas, 3 completas (Mercado, Recurso y Tipo de local) y 1 en el campo (Negocio). El 2026-09-17, «Lista de hechizos» (completa) pasa a «Hechizo» (rápida) y se añaden «Tipo de local» (completa) y «Titular» (rápida).

| Selector y dónde | Patrón | Campos | Validaciones clave | Al crear | Se gestiona en |
|---|---|---|---|---|---|
| **Categoría de movimiento** (n.º 6): J2b, J2c y «Nuevo movimiento» de A2 | Rápida, sin grupo | Nombre («N de 40»). Línea: «Irá a «Tus categorías» y la verás en todas tus partidas.» | Duplicado frente a las 27 de la app y las tuyas («Ya existe «Alojamiento» en Gastos del personaje.»); parecida («Salario» → «Salarios»); reservados | Se guarda al momento en «Tus categorías» con la marca «tuya». Vuelve con el foco en la cantidad del importe. El selector cuenta 28. Aparece en J5 y, cuando algún movimiento la usa, en los filtros de J2 y A2 | P7 › Categorías. Las tuyas cambian de grupo. Eliminar en uso: «Sus registros pasan a», obligatorio |
| **Categoría de gasto o ingreso recurrente** (usa el n.º 6): «Gasto e ingreso recurrente» (J5) | Rápida, igual | Nombre. Subtítulo «Para «Gasto e ingreso recurrente»: se elegirá al crearla.» | Iguales | Vuelve con el foco en Frecuencia. Los cobros que cree el avance usan la categoría; los ya registrados conservan la suya y se cambian uno a uno con J2c | P7 › Categorías. Al eliminar, los recurrentes y sus movimientos pasan a la elegida, también en la copia del último avance |
| **Ubicación** (n.º 8): «Objeto» (J3) y «Pergamino» (J7) | Rápida, sin grupo | Nombre («N de 60»). Línea: «Irá a «Otras», solo en La Sombra del Este.» | Duplicado también frente a las calculadas («Ya existe «Caja de Bree» (Asentamientos).»); parecida («Establo» → «Establo de Bree»); reservados | Ubicación en «Otras» con «0 objetos». Al guardar el objeto pasa a «1 objeto» y sale en el filtro de J3 | P7 › Ubicaciones. Renombrar cambia los objetos y el «en …» de los pergaminos. Eliminar con objetos: «Sus objetos pasan a», obligatorio; el patrimonio no cambia |
| **Contraparte** (n.º 9): «Deuda o préstamo» (J4 y A2b) | Rápida, sobre «Personas y entidades» | Nombre («N de 60»), con la ayuda «Puedes añadir quién es: «Hobart Brezal, herrero».». Línea: «Irá a Personas y entidades: sirve también para ventas, tributos y locales.» | Duplicado frente a toda la lista («Ya existe «Corona de Arthedain».»); parecida con lo anterior a la coma («Mercader de Esgaroth» → «Dalen, mercader de Esgaroth») | Vuelve con el detalle «sin deudas». Al guardar la deuda pasa a «Con deudas abiertas» con su saldo. Las deudas de impago reutilizan o crean personas (sección 9) | P7 › Personas y entidades. Renombrar cambia deudas, ventas, tributos y locales. Eliminar con deudas: obligatorio; solo con ventas, tributos o locales: opcional, «Dejarlos sin nombre» |
| **Comprador** (n.º 10): J3b, campo opcional | Rápida, sobre «Personas y entidades» | Nombre («orfebre de fornost» → «Orfebre de Fornost»). Línea: «…sirve también para deudas, tributos y locales.» | Iguales. Para vender no hace falta dar de alta a nadie | Vuelve con el foco en Fecha. La venta guarda compradorId al pulsar «Vender». Si se cancela J3b, la persona queda «sin usos» | P7 › Personas y entidades: es el único sitio para corregir el comprador de una venta. Al eliminarlo, opcional «Dejarlas sin comprador» |
| **Negocio** (n.º 12): «Inversión» (J6) | En el campo | El propio campo Negocio, con la etiqueta «nuevo»; Descripción, opcional | De 2 a 60; sin búsqueda no hay acción; coincidencia exacta: se elige el existente; negocio activo: aviso ámbar, no bloquea | Nada hasta «Guardar inversión». Tarjeta en «Activos»; los beneficios guardan inversiónId | J6: renombrar editando la inversión; eliminar con su formulario. Sale del selector cuando no queda ninguna inversión con ese nombre |
| **Hechizo** (n.º 14): J8 y «Pergamino» | Rápida, sin grupo (va a «En estudio») | Solo el Nombre («N de 60»). Línea: «Irá a «En estudio». Lista, reino y nivel se completan en el hechizo.» | Obligatorio, de 2 a 60 caracteres y único entre los hechizos de Tharan («Ya tienes «Paso sin rastro» (En estudio). Si es de otra lista, añádela al nombre: «Luz (Caminos de la luz)».»). Desde J8, un duplicado Aprendido no ofrece «Elegir»: la línea dice «Ya tienes «Hablar con los animales» aprendido: vuelve a ponerlo «En estudio» en su hechizo para registrar intentos.» y «Crear y elegir» queda desactivado. Si la búsqueda de J8 coincide exactamente con un hechizo Aprendido, el pie dice «“Hablar con los animales” está aprendido», sin acción | Hechizo «En estudio», con 0 intentos, en J7. Desde J8: «De este hechizo» vacío en «Pergamino usado». Desde «Pergamino»: hechizoId | J7 › Hechizos: lista, reino, nivel y estado en el formulario «Hechizo». Eliminar borra sus intentos; sus pergaminos se conservan, sin hechizo, con su nombre y su fecha de consumo. Sustituye a la alta completa «Nueva lista de hechizos» (decidido por el usuario el 2026-09-17) |
| **Mercado** (n.º 17): A8b y «Añadir existencias» con «Comprar»; A10b y «Editar caravana» antes de salir | Completa, con «Mercado y precios» (A10c) | Nombre a todo el ancho; días de viaje desde el asentamiento de la pantalla (obligatorio, «Solo ida: sale hoy y vuelve el 22 de abril»; la ayuda calcula la vuelta con la salida del origen); desde los demás (opcional, «Sin ruta»); precio del recurso del origen (obligatorio en A10b y en compras); otros precios con «+ Añadir precio» | Duplicado frente a los mercados de la partida y a los locales, que llevan el nombre de su asentamiento («Ya existe «Fornost» · 4 días desde Bree.»); días enteros de 1 a 365 («0 días es el mercado local de Bree, que ya existe»); precio mayor que 0 («Anota el precio de los víveres en Cavada Grande para calcular la caravana»); un recurso no repite fila | Mercado y una Ruta por asentamiento con días. A10b: «Cavada Grande · 5 días de viaje», «Víveres · 0,28 mo el saco», «Vuelve el 22 de abril», «Se paga al salir −28 mo», «La caja queda en 312,6 mo», «Días con falta de víveres hasta el 25: de 3 a 0 días». En A8b el botón pasa a «Enviar caravana». Columna nueva en A10 | A10 › Precios por mercado. Eliminar bloqueado con caravanas en ruta («Espera a que vuelva la caravana del 22 de abril»); el local cambia de nombre con su asentamiento y no se elimina |
| **Recurso** (n.º 18): materiales de A9b y «Editar obra»; A10b en compra y «Editar caravana»; «Añadir existencias»; «Consumo por habitante»; cada fila de «Producción» en «Edificio» (A7b); precios de «Mercado y precios» sin apilar | Completa, con «Recurso del catálogo» | Nombre («Cal»); unidad en singular y plural, con el plural propuesto (vocal +s; consonante +es; z → ces; -ón, -án, -én y -és pierden la tilde) y chips de 44 px con las ya usadas (saco, haz, carretada, lingote, barril, fardo); existencias en Bree (solo si el origen no trae entrada; si la trae, «Entrarán con la compra: 20 carretadas» o «Entrarán al volver la caravana: 20 carretadas»); capacidad (opcional, «Sin límite»); precio en el mercado del origen (obligatorio en A10b y en «Añadir existencias» con «Comprar») | Duplicado frente a todo el catálogo («Sal ya está en el catálogo.»); reservado «Víveres» («Los víveres los crea la partida con su ración»); parecido («Carbones» → «Carbón»); unidad de 1 a 20 caracteres por forma; existencias ≥ 0; capacidad > 0 y no menor que las existencias | RecursoCatálogo al momento, para todas las partidas, y el precio si se dio. La Existencia se crea al guardar el origen, si usa el almacén del asentamiento. A9b: «Cal · 20 carretadas · Hay 0» en lacre y «Faltan 20 carretadas de cal» | A8 (existencias y capacidad; unidad en solo lectura) y P7 › Recursos (nombre y unidad). Bloqueos del patrón 5 |
| **Tipo de edificio** (n.º 20): «Edificio» (A7b); A9b y «Editar obra» con «Construir edificio» | Rápida, con grupo en selector | Nombre («Ahumadero»); Grupo (Alimentos, Materias primas, Artesanía, Almacenaje, Servicios), con la ayuda «Irá a este grupo en todas tus partidas.» | Duplicado frente a los 24 y los tuyos («Ya existe «Horno» en Alimentos.»); el plural cuenta; «Elige dónde aparece» | En «Edificio», propone el Nombre si está vacío. En A9b: «Al terminar: edificio «Ahumadero del río» (Ahumadero), inactivo hasta que lo actives en Edificios». El tipo no trae producción | P7 › Tipos de edificio («1 edificio en Bree · 1 obra planificada»). Eliminar en uso: «Sus registros pasan a», para edificios y obras pendientes |
| **Oficio** (n.º 22): «Contratar trabajadores» (A5) | Rápida, con grupo en segmentos y plural | Nombre en singular; Plural propuesto (en compuestos, la palabra antes de «de»: «Maestro de obras» → «Maestros de obras»); Grupo: Campo, Materias primas, Oficios, Servicios | Duplicado frente a los 23 y los tuyos; plural de uno existente («Granjeros»: «Ya existe «Granjero»: el plural va al lado.»); termina en -s o -es sin singular existente: ámbar «Escríbelo en singular: el plural va al lado» | Vuelve con el foco en Número. A5 usa el plural cuando el número es mayor que 1 | P7 › Oficios («6 trabajadores en Bree»). Eliminar en uso: «Sus trabajadores pasan a»; salarios y costes no cambian |
| **Tipo de unidad** (n.º 23): «Unidad de guarnición» (A6) | Rápida, con grupo en segmentos | Nombre, con la ayuda «El tipo es genérico: el nombre de la unidad («Guardias de la puerta») va en el formulario.»; Grupo: Tropa (inicial) o Mandos | Duplicado frente a los 8 y los tuyos; el plural cuenta; más de 3 palabras o con «de la» o «del»: ámbar «Parece el nombre de una unidad: escríbelo en Nombre» | Vuelve con el foco en Nombre | P7 › Tipos de unidad («6 soldados en Bree»). Eliminar en uso: «Sus unidades pasan a» |
| **Tipo de defensa** (n.º 24): «Defensa» (A6); A9b y «Editar obra» con «Construir defensa» | Rápida, sin grupo | Nombre («Barbacana»). Línea: «Aparecerá en los tipos de defensa de todas tus partidas.» | Duplicado frente a los 6 y los tuyos; el plural cuenta; parecido («Torre» → «Torre de vigía») | En «Defensa», propone el Nombre; el estado inicial es «Buena». En A9b: «Al terminar: defensa «Barbacana del sur» (Barbacana), en buen estado» | P7 › Tipos de defensa («1 defensa en Bree»). Eliminar en uso: «Sus defensas pasan a», también para obras pendientes |
| **Destinatario** (n.º 27): «Ingreso o tributo» (A3), solo en tributos | Rápida, sobre «Personas y entidades» | Nombre («N de 60»). Línea: «…sirve también para deudas, ventas y locales.» | Iguales que Contraparte | Vuelve con el foco en Importe. Si el tributo no se puede pagar, la deuda de impago usa este destinatario como contraparte | P7 › Personas y entidades. Eliminar con tributos: opcional, «Dejarlos sin destinatario»; con deudas, obligatorio |
| **Tipo de animal** (n.º 34): A12b y editar fila de A12 | Rápida, con grupo en selector | Nombre en singular («cabr» → «Cabra montés»); Grupo (11 grupos; «Ovino y caprino» para «cabr»), con la ayuda «Irá a este grupo en todas tus partidas.» | Duplicado frente a los 57 y los tuyos («Ya existe «Cabra» en Ovino y caprino.»); el plural cuenta; parecido («Cabra montés» → «Cabra»); «Elige dónde aparece» | Vuelve con el detalle «no tienes» y el foco en Cantidad. El buscador cuenta «58 tipos». Tipo y género siguen siendo únicos por asentamiento | P7 › Tipos de animal («6 en Bree»). Cambiar el grupo cambia la columna Grupo de A12. Eliminar en uso: «Sus animales pasan a», con suma y valor por cabeza (patrón 5) |
| **Tipo de local** (n.º 38): «Local comercial» (A3b) | Completa, con «Tipo de local» | Nombre; impuesto %; mínimo al mes (campo de importe); día de cobro | Nombre con las reglas comunes, sin repetir un tipo del asentamiento; porcentaje de 0 a 100, con hasta 2 decimales; mínimo de 0 o más; día de cobro de 1 a 31 (si no existe en el mes, el último día) | Tipo del asentamiento, que aparece ya en A3b › Tipos de local. Vuelve al local con el tipo elegido. Todos los locales de ese tipo usan su regla | A3b › Tipos de local. Eliminar bloqueado mientras tenga locales («Herrería tiene 1 local: cámbialo de tipo antes») (decidido por el usuario el 2026-09-17) |
| **Titular** (n.º 39): «Local comercial» (A3b), campo opcional | Rápida, sobre «Personas y entidades» | Nombre («N de 60»). Línea: «…sirve también para deudas, ventas y tributos.» | Iguales que Contraparte | Vuelve al local con el titular elegido. En P7, la persona muestra «titular de 1 local» | P7 › Personas y entidades. Eliminar con locales: opcional, «Dejarlos sin titular»; con deudas, obligatorio (decidido por el usuario el 2026-09-17) |

## 7. Reglas de cálculo que se muestran en pantalla

- **Dinero**: ver sección 3. Toda cifra monetaria se calcula en unidades base y se muestra en mo.
- **Patrimonio** del personaje = bolsa + inventario (sin objetos archivados) + inversiones activas (capital completo; la participación es informativa) + lo que te deben − lo que debes (pendiente con intereses). Solo cuenta las deudas del personaje: las de un asentamiento van en A2b y no entran (decidido por el usuario el 2026-09-16).
- **Balance mensual** de un asentamiento = ingresos recurrentes (también los impuestos de locales, con la producción habitual) − gastos recurrentes (salarios, soldadas, tributos), prorrateados a 30 días con la tabla de la sección 3 y con 1 decimal. No incluye comercio ni movimientos manuales. Bree: entran 44 · salen 55,4 → −11,5 mo (39,2571 + 4,7 − 55,4286 ≈ −11,4714; en mh, 4.395.714 − 5.542.857 = −1.147.143, es decir −11,47143 mo).
  - Inicio muestra solo el balance; el desglose «entran · salen» va solo en A1.
  - Los impuestos de locales suman +4,7 mo al balance y a los ingresos de A3 (decidido por el usuario el 2026-09-17). A3 no tiene fila de cifras:
    - Cabecera del panel Ingresos: «+44 mo al mes» (39,2571 + 4,7 = 43,9571).
    - Cabecera del panel Tributos: «−25 mo al mes».
    - Nota debajo: «Resultado fiscal: +19 mo al mes (ingresos menos tributos, sin salarios ni guarnición).» (43,9571 − 25 = 18,9571).
- **Impuestos de locales comerciales** (decidido por el usuario el 2026-09-17):
  - Son negocios de terceros del asentamiento, que pagan impuestos a la caja. Su producción es dinero y no entra en el almacén. No son los edificios de Producción.
  - **Tipo de local**: nombre, impuesto % (de 0 a 100, con hasta 2 decimales), mínimo al mes (importe, 0 o más) y día de cobro (de 1 a 31; si no existe en el mes, el último día). El impuesto y el mínimo se fijan por tipo, y todos los locales de ese tipo usan su regla.
  - **Local comercial**: nombre, tipo, titular (opcional, de «Personas y entidades»), producción habitual al mes (importe), estado Abierto o Cerrado, notas y producciones anotadas por mes. Guarda también su alta (la fecha actual al crearlo), cobradoHasta (año-mes; al crearlo, el mes anterior al del alta) y estadoDesde.
  - **Producción del mes**: el jugador anota lo que produjo de verdad un local en un mes (importe y nota). Sin anotación, cuenta la producción habitual. Anotar 0 = no produjo, así que paga el mínimo.
    - La producción habitual y la del mes son de 0 o más, con decimales. Error: «La producción no puede ser negativa».
  - **Impuesto de un local en un cobro** = máx(porcentaje del tipo × producción del mes, mínimo del tipo).
    - El porcentaje × producción se calcula en mh y se redondea al mh, con las mitades hacia arriba. Después se toma el máximo con el mínimo.
    - Se cobra el día de cobro de su tipo, por el **mes anterior**: el 1 de mayo se cobra la producción de abril.
    - Ejemplo del usuario: Herrería 1 produce 10 mo → 10 % = 1 mo, que supera el mínimo de 2 mp. Si en abril se anota 1 mo o 0 → 0,1 mo o 0, por debajo del mínimo → paga 2 mp = 0,2 mo.
  - **Cada mes se cobra una sola vez**:
    - El día de cobro de su tipo actual, el motor cobra los meses del local desde cobradoHasta + 1 hasta el mes anterior, cada uno con su producción, y actualiza cobradoHasta. Si son dos meses, el concepto dice «marzo y abril».
    - Cambiar el tipo de un local o el día de cobro de un tipo no cobra un mes dos veces ni se lo salta. «Deshacer avance» lo restaura con el snapshot.
    - El mes del alta se cobra entero, sin prorratear. Los meses anteriores al alta no se cobran.
  - **Valores del cobro**: la producción habitual, el porcentaje y el mínimo son los vigentes el día del cobro, para todo el mes cobrado y sin prorratear. Lo ya cobrado no cambia. Por eso el formulario «Tipo de local», si el tipo tiene locales, avisa: «Vale desde el próximo cobro (1 de mayo), también para la producción de abril».
  - **Estado**: un cambio de estado cuenta desde el día siguiente a la fecha actual (estadoDesde).
    - Un mes se cobra si el local estuvo Abierto algún día de ese mes, con el mínimo entero y sin prorratear.
    - Si estuvo cerrado todo el mes, no paga. En A3c, el resumen dice «Cerrado todo el mes: no paga».
  - **Cobro**: el motor crea un movimiento agrupado por asentamiento y día, en la categoría Impuestos (sección 9). No hay impagos, porque es un cobro.
    - Un local con impuesto 0 no cuenta en el cobro. El número entre paréntesis del concepto cuenta los locales que pagan.
    - Si ningún local paga ese día, no hay movimiento ni marca «Impuesto locales».
    - El movimiento guarda el detalle por local. J2c lo muestra en solo lectura («Herrería 1 · abril · 10 mo, habitual · +1 mo») encima del importe total, que es lo único editable.
  - Anotar la producción de un mes ya cobrado no recalcula el cobro: se corrige su movimiento. El selector de mes solo ofrece los meses sin cobrar del local: desde cobradoHasta + 1 (nunca antes del mes de su alta) hasta el mes actual, con el actual primero y sin meses futuros.
  - **Equivalente mensual y balance**: usan solo la producción habitual.
    - Equivalente mensual = suma, por cada local abierto, de máx(% del tipo × habitual, mínimo). Los cerrados cuentan 0. Bree: +4,7 mo al mes (1 + 3,2 + 0,3 + 0,2).
    - La fila de A3 dice «4 locales», o «N abiertos · M cerrados» si hay alguno cerrado.
  - **Previsiones y calendario**: las previsiones usan la producción anotada del mes cobrado si la hay y, si no, la habitual. Hay una marca de cobro «Impuesto locales» por asentamiento y día, aunque cobren varios tipos.
  - **Eventos**: sus efectos no se aplican al impuesto de locales. Si un evento cambia la producción de un mes, se anota en A3c.
  - Eliminar un tipo se bloquea mientras tenga locales. Eliminar un local borra sus producciones anotadas. Los cobros pasados no cambian y su detalle conserva el nombre del local, sin localId.
- **Víveres** (decidido por el usuario el 2026-09-15; ración y nombre revisados el mismo día):
  - Se guardan en sacos. **1 saco = 30 kg = víveres para 1 persona durante díasPorSaco días (30)**: se calcula 1 kg al día por persona, con margen para las pérdidas del almacén. La ración se ve al crear la partida y se usa en toda ella. Es fija: no hay «Cambiar ración» (propuesta aceptada por el usuario el 2026-09-17).
  - **Consumo** de la población = habitantes ÷ díasPorSaco sacos al día (1/30 ≈ 0,033 sacos por persona). Se calcula con decimales y los sacos se muestran redondeados a la unidad. Bree, con 1.240 habitantes, come unos 41 sacos al día (41,33) y 289 a la semana.
  - **Añadir víveres** se expresa como personas × duración, o directamente en sacos. Sacos = personas × días ÷ díasPorSaco, redondeando hacia arriba (semana = 7 días, mes = 30, año = 365). Ejemplo: 100 personas durante 1 mes = 100 sacos.
  - **Precio de referencia**: 1 mb por kg en Fornost, es decir 0,3 mo el saco. Cada mercado aplica su situación: Tharbad, puerto fluvial con excedentes, 0,25 mo; Bree, con la cosecha mermada por las lluvias, 0,4 mo. Comprobación: los víveres de un mes para una persona (0,4 mo en Bree) es cerca de un tercio del salario mensual de un peón (0,3 mo a la semana ≈ 1,29 mo al mes).
  - **Comprando en el mercado local**, se paga al momento y los sacos entran ese día. **En otro mercado** se crea una caravana. **Recibir sin coste** (cosecha, regalo) solo suma sacos.
- **Habitantes** = habitantes iniciales + cambios de población con fecha hasta ese día.
- **Reservas del almacén** (decidido por el usuario el 2026-09-15): aparte de los víveres, el almacén guarda reservas de **cerveza, madera, piedra y arcilla**, además de otros recursos como hierro o lana.
  - La cerveza y la leña se consumen aparte de los víveres, con una cantidad por habitante al día. Cada consumo tiene un nombre y el recurso del que descuenta: la leña descuenta de la madera.
  - La piedra, la madera, la arcilla y el hierro se gastan en obras.
  - Todas las reservas muestran días de reserva y previsión a 30 días, y se reponen con «Añadir existencias» (en el mercado local, en otro mercado con caravana o sin coste), con caravanas o con producción.
  - Precios de referencia por carretada: piedra 0,15 mo en Bree (tiene cantera), 0,25 mo en Fornost y 0,3 mo en Tharbad; arcilla 0,1 mo en Bree, 0,15 mo en Fornost y 0,08 mo en Tharbad (arcilla de río).
- **Días de reserva** de un recurso = días hasta el día en que empieza la falta, según la simulación del motor (producción, consumo y caravanas ya en ruta). Sin consumo: «Sin consumo». Ejemplo de Bree el 12 de abril: víveres 11 (el 23 de abril), cerveza unos 105 días, madera unos 85 días.
- **Previsión a 30 días** = simulación del motor sobre los 30 días siguientes a la fecha actual, sin guardar (sección 9).
- **Fecha máxima de las previsiones**: los días de reserva, la previsión a 30 días y las previsiones de A7 y A7b se cortan en el 31 de diciembre de 9999: no calculan fechas posteriores (sección 9) (criterio por defecto del 2026-09-17; revisable).
- **Capacidad**: lo que excede la capacidad al producir o al llegar una caravana se pierde, con aviso ámbar («Se perdieron N …»). Las entradas manuales no pueden superar la capacidad (error bajo el campo: «Caben 890 sacos más»). Sin capacidad no hay límite.
  - El aviso «Recurso perdido» sale si la pérdida ocurrió durante un avance o está prevista en 30 días o menos, en ámbar.
  - En A8, las entradas son lo que entra de verdad; debajo, «se pierden N» si la simulación pierde algo.
- **Producción** de los edificios (decidido por el usuario el 2026-09-17):
  - **Solo extracción: producir no gasta recursos.** Un edificio genera sus recursos sin gastar nada del almacén. No hay insumos ni transformación (sección 11).
  - **Lista de producciones**: cada edificio tiene 0 o más producciones, cada una con su recurso, cantidad base y frecuencia (selector n.º 13). Ejemplo del usuario: mina con «Piedra · 10 carretadas · Mensual · día 1».
  - **Factor diario** de un edificio = estado × trabajadores × eventos:
    - Estado: 1 si está Activo; 0 si está Dañado, Inactivo o Alquilado.
    - Trabajadores: mín(1, asignados ÷ necesarios); 1 si necesarios = 0. Asignados = suma del número de los trabajadores con ese edificio.
    - Eventos: máx(0, 1 + suma de los % de los eventos de producción activos ese día sobre ese edificio o sobre todos). Un evento con objetivo un edificio afecta a todas sus producciones.
    - Contratar, cambiar el número o el edificio en A5, y cambiar el estado o los necesarios en A7b cuentan desde el día siguiente a la fecha actual, sea cual sea el primer pago.
    - **Alquilado**: al pasar a Alquilado, las producciones y su acumulado se conservan ocultos. La siguiente ocurrencia suma lo acumulado hasta el día del cambio y las siguientes producen 0. Al volver a Activo reaparecen como estaban.
  - **Cantidad producida en una ocurrencia** = cantidad base × (suma de los factores diarios del periodo ÷ días del periodo). Los cambios de trabajadores, estado o eventos durante el periodo cuentan en proporción a los días.
    - Ejemplo del usuario: mina de 10 carretadas al mes con 3 mineros necesarios; 15 días con 2 y 15 días con 3 → 10 × (15 × 2/3 + 15 × 1) ÷ 30 ≈ 8,3 carretadas.
    - Con condiciones constantes el resultado es el de siempre: la cantera con 2 de 3 canteros produce 25 × 2/3 ≈ 16,67 carretadas de piedra a la semana.
  - **Periodo y acumulado** (regla única):
    - Los días del periodo son siempre los de la recurrencia: del día siguiente a la ocurrencia anterior (real o teórica) al día de la ocurrencia, ambos incluidos. Mensual el día 1: del 2 de abril al 1 de mayo, 30 días.
    - Dar de alta una producción, o cambiar su recurso o cualquier parte de su frecuencia (tipo, N, día, mes, «Primera vez» o fecha de inicio), pone el acumulado a 0, con `desde` = día siguiente a la fecha actual. Los días del periodo anteriores a `desde` cuentan 0.
    - Los días anteriores al periodo de la primera ocurrencia de la producción cuentan 0, tanto con «Primera vez» como con fecha de inicio. Así no se acumula producción antes de tiempo aunque la primera ocurrencia esté lejos (decidido por el usuario el 2026-09-17).
      - Ejemplo con «Primera vez»: el 12 de abril, «Cada 2 meses · día 15» con primera vez el 15 de junio. Su periodo va del 16 de abril al 15 de junio: el 13, el 14 y el 15 de abril cuentan 0.
      - Ejemplo con fecha de inicio: el 12 de abril, «Mensual · día 1» con fecha de inicio el 1 de julio. La primera ocurrencia es el 1 de julio y su periodo va del 2 de junio al 1 de julio: del 13 de abril al 1 de junio cuentan 0.
    - Cambiar solo la cantidad conserva lo acumulado y vale para la próxima ocurrencia.
    - Las previsiones parten del acumulado guardado, así que los días ya avanzados del periodo en curso conservan su factor.
    - Ejemplo: de semanal a «Mensual · día 1» el 29 de abril, con 2 de 3 canteros → el 1 de mayo, 10 × 2 × 2/3 ÷ 30 ≈ 0,4 carretadas (cuentan el 30 de abril y el 1 de mayo).
  - **Cuándo se suma**: el día de la ocurrencia, en el paso de producción del motor (sección 9). Si el día no existe en el mes, el último día.
  - **Capacidad**: lo que no cabe en el almacén se pierde, con aviso ámbar.
  - **Edición**:
    - Quitar una producción descarta lo acumulado (6.4).
    - **Correcciones que no recalculan**: lo acumulado de días ya simulados no se recalcula al editar o eliminar eventos, trabajadores o el estado, ni con «Terminar hoy», aunque la producción aún no haya entrado. Si fue un error, se corrige tras la ocurrencia con un ajuste de existencias en A8.
    - Los cambios con fecha pasada no se aplican hacia atrás (regla general).
  - **Previsiones** (A7, A7b, A8, días de reserva, P4 y calendario): usan la simulación, así que ya incluyen la proporción. Las de A7 y A7b simulan hasta la próxima ocurrencia de cada producción, como mucho 366 días.
    - Si la primera ocurrencia de una producción cae a más de 366 días, fuera de ese horizonte, A7 y A7b muestran solo su fecha, sin cantidad prevista (criterio por defecto del 2026-09-17; revisable).
- **Efectos de eventos**: el consumo, los costes y los ingresos afectados = base × máx(0, 1 + suma de los % de los eventos activos sobre ese objetivo). El objetivo de un efecto es todos, un edificio, un recurso, una categoría de coste o un impuesto. Los efectos de eventos no se aplican al impuesto de locales comerciales: si un evento cambia la producción de un mes, se anota en A3c (decidido por el usuario el 2026-09-17). Los efectos de un evento registrado con fecha pasada o de hoy cuentan desde el día siguiente a la fecha actual. «Terminar hoy» no recalcula lo aplicado. Un evento de partida no tiene efectos (propuesta aceptada por el usuario el 2026-09-17).
- **Obras**:
  - El coste y los materiales se descuentan al empezar. El coste crea un movimiento vinculado. Una obra planificada no descuenta nada.
  - Empezar una obra exige los materiales: si faltan, «Empezar obra» se desactiva. Si falta dinero, se aplica la regla de saldo negativo (6.4).
  - «Empezar obra» con inicio futuro deja la obra programada: el motor la empieza en el paso 3 (sección 9). Una obra planificada no empieza sola. Una obra programada que no alcanza no empieza y da aviso rojo (sección 9).
  - El efecto se aplica el día que termina:
    - Construir edificio: crea un edificio del tipo elegido, con el nombre de la obra, Inactivo, sin producción y con 0 trabajadores necesarios; añadir producción no cambia el estado. Da un aviso ámbar en Inicio: «Horno comunal está terminado: anota su producción y sus trabajadores». El aviso dura hasta que se guarde el edificio en A7b por primera vez o se elimine.
    - Mejorar edificio: no cambia la producción por sí sola. Al terminar da el aviso ámbar «La mejora de Cantera está terminada: anota su producción», que lleva a A7b y desaparece al guardar el edificio. El cambio cuenta desde el día siguiente a la fecha actual.
    - Ampliar almacén: suma la capacidad añadida al recurso elegido.
    - Construir defensa: crea una defensa del tipo elegido, con el nombre de la obra y estado Buena.
    - Reparar edificio o defensa: el estado pasa a Activo o Buena.
  - Eliminar una obra terminada no deshace su efecto.
- **Caravanas**:
  - **Compra**: se paga al salir y los recursos entran al volver.
  - **Venta**: los recursos salen al salir y el dinero entra al volver. La carga no puede superar las existencias.
  - **Traslado**: los recursos salen del almacén al salir y entran en el asentamiento de destino al llegar. Duración de un traslado = días de viaje de ida; Caravana.vuelta guarda la llegada. No mueve dinero. Solo con 2 o más asentamientos (propuesta aceptada por el usuario el 2026-09-17). La carga no puede superar las existencias.
  - Duración de compra y venta = días de viaje de ida y vuelta. Los días de viaje se guardan solo de ida.
  - El precio por unidad se precarga con el del mercado y se puede cambiar; «Guardar como precio de …» lo guarda en el mercado.
  - Vender en el mercado local es una caravana con 0 días: se cobra y los recursos salen al momento.
  - Pago al salir y cobro al volver son movimientos vinculados.
  - Una caravana registrada con salida pasada calcula su vuelta desde la fecha real; si la vuelta ya pasó, se aplica el primer día del siguiente avance.
- **Deudas**:
  - Un pago se aplica según «Se aplica a» (por defecto, intereses y capital: primero intereses y después capital).
  - El interés periódico se calcula sobre el capital pendiente. Cada interés sumado queda como devengo (fecha, importe y avance). Un pago con fecha anterior a un devengo no lo recalcula.
  - **Vencimiento: solo aviso** (decidido por el usuario el 2026-09-16). Al vencer no se paga nada. Ese día, primero se suma el interés del día y después vence. La deuda pasa a «Vencida», sale un aviso rojo («Venció la deuda con Hobart: 4 mo pendientes»; en un préstamo que te deben: «Dalen no ha devuelto 15 mo») y los intereses siguen corriendo hasta que se registra el pago con J4b. Aviso ámbar si vence en 10 días o menos (así el préstamo del Gremio, que vence a 12 días el 19 de abril, todavía no avisa). En el calendario, en Inicio y en J1 se muestra como aviso sin signo («Vence · 4 mo pendientes»).
  - **Alta con dinero**: «El dinero entra en / sale de» crea un movimiento vinculado de «Préstamos y deudas». Con «Ninguno: solo anotar la deuda», no mueve dinero.
  - **Impagos**: deuda automática con su contraparte, sin interés ni vencimiento (sección 9). En un asentamiento va en A2b.
  - Una deuda está saldada cuando no queda nada pendiente, y pasa al grupo «Saldadas».
- **Venta de objetos**:
  - El dinero entra por el precio de venta y el objeto sale por su valor anotado. La diferencia cambia el patrimonio.
  - No se puede vender más de lo que se tiene.
  - Vender todas las unidades archiva el objeto como «Vendido»; la venta guarda su nombre y su valor anotado.
  - Eliminar la venta borra su movimiento y devuelve las unidades (el objeto archivado se restaura).
- **Inventario y pergaminos**:
  - «Añadir también al inventario» (J2b, solo en gastos) crea una fila nueva, salvo que exista otra con el mismo nombre, ubicación y valor por unidad, que se suma. Valor por unidad = importe ÷ cantidad, editable. Con fecha futura, el objeto se crea al aplicarse el movimiento.
  - El objeto de un pergamino tiene siempre cantidad 1 y se crea como «Pergamino «X»». Valor y ubicación se editan desde cualquiera de los dos formularios.
  - Vender el objeto marca el pergamino como «vendido». Eliminar la venta lo devuelve a «poseído».
  - Consumirlo en J8 lo marca como «consumido», con su fecha de consumo. Consumir o perder un pergamino archiva su objeto (fuera del patrimonio, como los «Vendido»), en lugar de borrarlo.
  - En el formulario «Pergamino» solo se elige a mano entre poseído y perdido: «vendido» lo pone J3b y «consumido» lo pone J8.
  - El hechizo de un pergamino es opcional (selector con altas), y su nivel también (decidido por el usuario el 2026-09-17):
    - Con hechizo, el nombre del pergamino se copia del hechizo. Sin hechizo, el formulario pide «Nombre del pergamino» (de 2 a 60 caracteres), y el pergamino sale en «Otros» en J8, sin crear un hechizo en estudio.
    - Renombrar el hechizo cambia el nombre de sus pergaminos, y el de sus objetos si todavía se llaman «Pergamino «nombre anterior»». Los conceptos de los movimientos ya registrados no cambian.
    - En J8, «Pergamino usado» agrupa «De este hechizo · Otros».
    - J7 muestra el reino del hechizo y el nivel del pergamino; si el pergamino no tiene nivel, el del hechizo.
    - Si se elimina su hechizo, el pergamino se conserva sin hechizo, con su nombre y su fecha de consumo.
  - Eliminar un intento que consumió un pergamino, desmarcar «El pergamino se consume» o cambiar de pergamino en J8 devuelve ese pergamino a «poseído» y restaura su objeto. Si se elimina un pergamino usado en un intento, el intento dice «con un pergamino eliminado».
  - Comprar un pergamino: casilla «Lo he comprado» del formulario «Pergamino», que crea el movimiento vinculado de «Pergaminos y estudio».
- **Estudio** (decidido por el usuario el 2026-09-17):
  - **Por hechizo, no por lista**: el jugador escribe el nombre del hechizo y va anotando sus intentos buenos y malos. Varios hechizos pueden estar en estudio a la vez.
  - **No se cuentan días de estudio**: no hay días acumulados, días dedicados ni «Sumar días al avanzar», y el motor no tiene paso de estudio.
  - Lista, reino y nivel son datos opcionales del hechizo, solo para ordenar y buscar. Nada se cuenta por lista.
  - J8 solo ofrece hechizos «En estudio». Al editar un intento, ofrece también su hechizo aunque esté Aprendido.
  - El resultado de un intento (bueno o malo) solo suma al conteo. El hechizo pasa a «Aprendido» únicamente cuando el jugador lo marca, según decida el máster.
  - **Fechas**:
    - La fecha de un intento es hoy o antes. El hechizo no tiene fecha de alta: un intento puede ser anterior a su creación, para anotar intentos atrasados. Solo se exige hoy o antes.
    - «Aprendido el» es obligatorio con «Aprendido», no puede ser posterior a hoy ni anterior al último intento (error «El último intento es del 10 de febrero») y se borra al volver a «En estudio».
    - Al editar un intento de un hechizo aprendido, la fecha no puede ser posterior a «Aprendido el».
  - **Nombre único** en el personaje. El mensaje de duplicado añade «Si es de otra lista, añádela al nombre: «Luz (Caminos de la luz)».».
  - Eliminar un hechizo borra sus intentos. Sus pergaminos se conservan, sin hechizo, con su nombre y su fecha de consumo, y sus objetos siguen en el inventario.
- **Saldo** de una bolsa o caja = saldo inicial + suma de sus movimientos no programados. Editar o eliminar un movimiento, o el saldo inicial, lo recalcula. Una acción manual puede dejarlo en negativo con confirmación (6.4).
- **Programados**: un movimiento con fecha futura queda programado. No cuenta en el saldo hasta que el avance llega a su fecha: los cobros se aplican en el paso de cobros y los pagos en el de pagos (sección 9), salvo los movimientos vinculados a obras, caravanas y compras, que se aplican en el paso 3 (pago al empezar o al salir) o en el 7 (cobro al volver).
- **Gastos e ingresos recurrentes** del personaje: se cobran y se pagan desde su cuenta en su fecha. Al reanudar uno en pausa, la próxima fecha se calcula desde hoy. Los ingresos recurrentes se cobran en el paso de cobros (propuesta aceptada por el usuario el 2026-09-17).
- **Animales y armería con dinero**: comprar o vender animales o equipo de la armería se anota aparte con «Nuevo movimiento» en A2 (categoría Comercio), y la cantidad se corrige editando la fila (propuesta aceptada por el usuario el 2026-09-17).

## 8. Modelo de datos

```
Partida { id, nombre, edad: segunda|tercera|cuarta, equivalencias, kgPorSaco: 30, díasPorSaco: 30 (fijo), fechaInicial, fechaActual(año, mes, día), creada, actualizada, versionFormato, cambiosDesdeÚltimoAvance }   // versionFormato 1 ya usa Hechizo, TipoLocal y LocalComercial; una copia mayor se rechaza y una menor se migra al importar (P0)
Dominio { id, partidaId, tipo: personaje|asentamiento, nombre, descripción?, categoría?: aldea|pueblo|ciudad }   // un solo personaje
Caja { dominioId, saldoInicial: Importe }                                                         // saldo = inicial + movimientos no programados
Importe { base, introducido?: { cantidad, moneda } }                                               // introducido vacío en importes calculados o agrupados y en la bolsa inicial de varias filas
Movimiento { id, dominioId, fecha, tipo: gasto|ingreso|transferencia, importe: Importe (base con signo), categoríaId, concepto, origen: manual|avance, avanceId?, vínculo?: { tipo, id }, regla?: { tipo, id }, inversiónId?, detalleLocales?: [{ localId?, nombre, mes, producción, anotada, impuesto }], programado: bool, editadoEl? }
// vínculo: registro del que sale (transferencia (Transferencia.id), venta, pago o alta de deuda, inversión, obra, caravana, entrada del almacén, pergamino); se edita desde ese registro
// regla: regla recurrente que lo creó (salario, soldada, tributo, impuesto, gasto o ingreso recurrente, beneficio, locales); no es vinculado
// regla = { tipo: locales, id: dominioId }: cobro agrupado de los impuestos de locales de un asentamiento en un día (decidido por el usuario el 2026-09-17)
// detalleLocales: solo en ese cobro; una entrada por local y mes cobrado, que J2c muestra en solo lectura; al eliminar un local, su entrada conserva el nombre, sin localId
Recurrencia = diaria { inicio? } | cadaNDias { n, primera } | semanal { diaSemana, inicio? } | quincenal { primera } | mensual { diaMes, inicio? } | cadaNMeses { n, diaMes, primera } | trimestral { diaMes, primera } | anual { mes, diaMes, inicio? } | unica { fecha }   // unión por tipo, como en el código (decidido por el usuario el 2026-09-17)
// diaSemana: 0 = lunes … 6 = domingo; quincenal: cada 14 días; n: de 2 a 366 en cadaNDias y de 2 a 12 en cadaNMeses; diaMes de 1 a 31 (en mensual, cadaNMeses y trimestral, el último día si el mes no lo tiene; en anual, un día que el mes tenga en algún año, y el 29 de febrero cae el 28 en los años no bisiestos)
// primera: la «Primera vez», que es una ocurrencia; no hay ninguna antes; en cadaNMeses y trimestral cae en diaMes o, si su mes no lo tiene, en el último día (decidido por el usuario el 2026-09-17). inicio: fecha de inicio opcional («no antes de»); no hay ocurrencias antes y no tiene que caer en el día elegido (sección 4)
// La próxima fecha no se guarda: se calcula con siguienteOcurrencia, para que no quede desfasada al deshacer un avance
// Todos los registros se pueden editar y eliminar; cada uno guarda editadoEl?, que se muestra. El aviso de «Deshacer avance» usa Avance.aplicadoEl y Partida.cambiosDesdeÚltimoAvance.

// Catálogos de la app: compartidos entre partidas (ámbito: propuesta aceptada por el usuario el 2026-09-17)
OpciónCatálogo { id, nombre, grupo?, plural?, propia, borrada, protegida? }     // categorías, oficios (con plural), tipos de edificio, de unidad, de defensa y de animal; las de la app tienen id fijo («cat.alojamiento»); protegida: se renombra, pero no se elimina (candado en P7)
RecursoCatálogo { id, nombre, unidadSingular, unidadPlural, propia, borrada, protegido?: víveres|reserva }   // todos los recursoId apuntan aquí

// Listas de cada partida
Ubicación { id, partidaId, nombre }                                  // solo las propias; Encima, cajas y almacenes salen de los dominios
PersonaEntidad { id, partidaId, nombre }                             // contrapartes, compradores, destinatarios y titulares de locales

// Dinero (personaje y asentamientos)
Transferencia { id, partidaId, fecha, importe: Importe, saleDeId, entraEnId, movimientoSaleId, movimientoEntraId }   // cada lado guarda su concepto en su movimiento («Transferencia a Bree», «Transferencia desde Tharan»)
Deuda { id, dominioId, sentido: debo|meDeben, contraparteId, fecha, principal: Importe, interésPct, recurrenciaInterés, vencimiento?, notas?, estado: abierta|vencida|saldada, impago: bool, origenImpago?, cuentaAltaId?, pagos: [{ id, fecha, importe: Importe, aplicarA, movimientoId }], devengos: [{ fecha, importe, avanceId }] }
RecurrenteDinero { id, dominioId, tipo: gasto|ingreso, concepto, importe: Importe, categoríaId, cuentaId, recurrencia, activo }   // sustituye a GastoRecurrente; sin primeraFecha propia: la fecha del primer cobro va en la recurrencia (primera o inicio) (decidido por el usuario el 2026-09-17)

// Personaje
ObjetoInventario { id, dominioId, nombre, cantidad, valorUnitario: Importe, ubicación: { tipo: encima|caja|almacén|propia, dominioId?, ubicaciónId? }, notas, movimientoCompraId?, archivado? }
Venta { id, objetoId, nombre, valorAnotado, cantidad, precioUnitario: Importe, compradorId?, movimientoId }
Inversión { id, dominioId, negocio, descripción, capital: Importe, participaciónPct, beneficio: Importe, recurrencia, cuentaCapitalId?, cuentaBeneficiosId, estado: activa|retirada, retirada?: { fecha, importe: Importe, movimientoId } }   // beneficios cobrados = movimientos con su inversiónId y regla beneficio; los movimientos de capital y retirada llevan solo vínculo, sin inversiónId
Hechizo { id, dominioId, nombre, lista?, reino?, nivel?, estado: enEstudio|aprendido, aprendidoEl?, notas? }   // sustituye a ListaHechizos (decidido por el usuario el 2026-09-17); nombre único en el personaje; lista, reino y nivel opcionales, solo para ordenar y buscar; varios en estudio a la vez; «aprendido» solo a mano; sin días de estudio
IntentoAprendizaje { id, hechizoId, fecha, resultado: bueno|malo, pergaminoId?, pergaminoConsumido, notas? }   // sin días dedicados; eliminar el hechizo borra sus intentos
Pergamino { id, dominioId, hechizoId?, nombre, nivel?, estado: poseído|consumido|perdido|vendido, consumidoEl?, objetoInventarioId?, movimientoCompraId? }   // hechizo opcional; nombre copiado del hechizo, o escrito si no tiene (de 2 a 60); sin hechizoId si se eliminó su hechizo, con su nombre y consumidoEl; consumido o perdido archiva su objeto

// Asentamiento
Población { dominioId, habitantesIniciales, cambios: [{ id, fecha, delta, motivo }], consumos: [{ id, nombre, recursoId, porHabitante }] }   // habitantes = iniciales + cambios hasta la fecha; víveres con la ración de la partida (díasPorSaco); consumo «Leña» con recursoId = Madera
Existencia { dominioId, recursoId, cantidad, capacidad? }                                           // sustituye a Recurso; sin capacidad = sin límite
AjusteExistencias { id, dominioId, recursoId, fecha, delta, motivo }                             // solo ajustes a mano; compras y recepciones son EntradaAlmacén
EntradaAlmacén { id, dominioId, recursoId, cantidad, personas?, días?, operación: compra|recepción, mercadoId?, precioUnidad?, movimientoId?, caravanaId?, fecha }   // sustituye a CompraVíveres
Edificio { id, dominioId, tipoId, nombre, estado: activo|dañado|inactivo|alquilado, trabajadoresNecesarios, producciones: [{ id, recursoId, cantidad, recurrencia, acumulado: { desde, sumaFactores } }] }
// producciones sustituye a producción? (decidido por el usuario el 2026-09-17): 0 o más, cada una con su recurso, cantidad base y frecuencia; acumulado.desde: primer día que puede sumar en el periodo en curso; acumulado.sumaFactores: factores diarios sumados desde ese día; el alta y los cambios de recurso o frecuencia lo ponen a 0, con desde = día siguiente a la fecha actual (sección 7); los días anteriores al periodo de la primera ocurrencia cuentan 0, aunque sean posteriores a desde (decidido por el usuario el 2026-09-17); se guarda en el estado y lo recoge snapshotPrevio
Trabajador { id, dominioId, oficioId, número, salario: Importe, recurrencia, edificioId? }
Obra { id, dominioId, nombre, estado: planificada|programada|enCurso|terminada, coste: Importe, materiales: { recursoId: cantidad }, inicio?, díasTotales, efecto: { tipo: crearEdificio|mejorarEdificio|ampliarAlmacén|crearDefensa|repararDefensa|repararEdificio, objetivoId?, tipoId?, recursoId?, valor? }, movimientoId? }
// efecto: crearEdificio y crearDefensa usan tipoId (toman el nombre de la obra); mejorarEdificio, repararEdificio y repararDefensa usan objetivoId; ampliarAlmacén usa recursoId y valor (capacidad añadida)
ImpuestoRenta { id, dominioId, sentido: ingreso|tributo, concepto, base: fija|porHabitante, importe: Importe, recurrencia, destinatarioId?, edificioId? }   // edificioId: renta de un edificio alquilado
TipoLocal { id, dominioId, nombre, pct, mínimo: Importe, díaCobro }   // decidido por el usuario el 2026-09-17; pct de 0 a 100, con hasta 2 decimales; díaCobro de 1 a 31 (si no existe en el mes, el último día); no se elimina mientras tenga locales
LocalComercial { id, dominioId, nombre, tipoId, titularId?, producciónHabitual: Importe, estado: abierto|cerrado, estadoDesde, alta, cobradoHasta: año-mes, notas?, producciones: [{ mes: año-mes, importe: Importe, nota? }] }   // titularId: PersonaEntidad; impuesto de un cobro = máx(pct × producción del mes anterior, mínimo); sin producción anotada cuenta la habitual; cerrado todo el mes no paga
// alta: fecha actual al crearlo; cobradoHasta: al crearlo, el mes anterior al del alta; el cobro lo actualiza y lo recoge snapshotPrevio; estadoDesde: día siguiente a la fecha actual al cambiar de estado
Mercado { id, partidaId, nombre, localDe?, precios: [{ recursoId, importe: Importe }] }             // localDe: asentamiento del mercado local (lo crea A0 sin precios; lleva el nombre del asentamiento y cambia con él; no se elimina)
Ruta { origenId, destinoId, díasViaje }                                                            // origen: asentamiento; destino: mercado o asentamiento; días solo de ida
Caravana { id, dominioId, operación: compra|venta|traslado, mercadoId?, destinoId?, carga: { recursoId, cantidad }, precioUnidad?, importe?, salida, vuelta, estado: programada|enRuta|terminada, movimientoSalidaId?, movimientoVueltaId? }
UnidadGuarnición { id, dominioId, tipoId, nombre, número, soldada: Importe, recurrencia }
Defensa { id, dominioId, tipoId, nombre, estado: buena|dañada|enRuinas }
Animal { id, dominioId, tipoId, cantidad, género: hembra|macho|mixto, valorUnitario?: Importe, notas? }   // tipo + género es único por asentamiento
ObjetoArmería { id, dominioId, nombre, cantidad, valorUnitario: Importe }                         // nombre libre; valor total = cantidad × valorUnitario (se calcula, no se guarda)
EventoNarrativo { id, partidaId, dominioId?, nombre, inicio, duraciónDías, efectos: [{ ámbito: producción|consumo|costes|ingresos, objetivo: { tipo: todos|edificio|recurso|categoríaCoste|impuesto, id? }, pct }], notas }   // sin dominioId = evento de partida, sin efectos

// Tiempo
Avance { id, partidaId, desde, hasta, aplicadoEl, cambios[], avisos[], snapshotPrevio }            // snapshotPrevio = la partida completa
```

## 9. Motor de avance de días

- Es una **función pura**: `simular(estado, días) → { estadoNuevo, cambios[], avisos[] }`. La vista previa (P4) la llama sin guardar; al confirmar se guarda `estadoNuevo` y se crea un `Avance` con la fecha en que se aplica y una copia de la partida completa.
- Procesa **día a día** y, dentro de cada día, en este orden:
  1. Eventos narrativos: activar o expirar.
  2. Cambios de población con fecha (habitantes = iniciales + cambios hasta ese día).
  3. Inicio de obras programadas, salida de caravanas y compras programadas: descuentan dinero, materiales o carga. Si no alcanza, no empiezan y dan aviso rojo.
  4. Producción de edificios: acumula el factor diario de cada edificio en sus producciones y, en la fecha de una ocurrencia, suma la cantidad al almacén.
  5. Consumo de la población.
  6. Avance de obras; al terminar, su efecto.
  7. Llegada de caravanas y traslados.
  8. Cobros: impuestos, rentas, impuestos de locales, beneficios, ingresos recurrentes y cobros programados.
  9. Pagos: salarios, soldadas, tributos, gastos recurrentes y pagos programados.
  10. Intereses y vencimientos de deudas: primero el interés del día y después el vencimiento.
- No hay paso de estudio: no se cuentan días de estudio. Los intentos solo se registran con J8 (decidido por el usuario el 2026-09-17).
- **Agrupación de movimientos**:
  - Los conceptos diarios forman un movimiento por concepto y avance, fechado el último día («Posada · 7 noches −0,7 mo»).
  - Los recurrentes no diarios forman un movimiento por ocurrencia, con su fecha.
  - Los salarios que se pagan el mismo día en un asentamiento se agrupan en uno («Salarios de 14 trabajadores»); igual las soldadas.
  - Los impuestos de locales que se cobran el mismo día en un asentamiento forman un movimiento, en la categoría Impuestos: «Impuestos de locales · abril (4)». El número entre paréntesis cuenta los locales que pagan. Si se cobran dos meses, «marzo y abril». Si ningún local paga ese día, no hay movimiento.
  - La producción y el consumo no crean movimientos.
  - Los movimientos manuales se fechan en la fecha elegida.
- **Falta de dinero (impagos)**:
  - Los pagos se hacen por filas, en el orden de la tabla. Queda como impago solo lo que no se paga, con aviso rojo.
  - El motor nunca deja una caja en negativo. Si la caja ya está en negativo por una acción manual, sus pagos quedan como impagos (decidido por el usuario el 2026-09-16).
  - Contraparte automática: salarios → «Trabajadores de Bree»; soldadas → «Guarnición de Bree»; tributos → su destinatario o, si no tiene, su concepto; gastos recurrentes y pagos programados → su concepto («Posada El Poney Pisador»).
  - Se reutiliza la persona con el mismo nombre normalizado. Si hay que crearla, P4 avisa «Se añadirá «Trabajadores de Bree» a Personas y entidades» y se crea al confirmar, porque simular() no guarda nada.
  - Hay una deuda de impago por origen, sin interés ni vencimiento, que acumula los impagos sucesivos mientras esté abierta.
- **Falta de recursos**: el consumo se detiene en cero y genera un aviso rojo con el día y la cantidad que faltó. No hay penalización automática; si el máster decide consecuencias, el jugador crea un evento narrativo.
- **Producción** (decidido por el usuario el 2026-09-17):
  - Cada día simulado suma el factor diario de cada edificio a sus producciones. Los días anteriores al periodo de la primera ocurrencia de una producción cuentan 0, con «Primera vez» o con fecha de inicio (sección 7) (decidido por el usuario el 2026-09-17).
  - El día de una ocurrencia calcula la cantidad, la suma al almacén y reinicia el acumulado.
  - El acumulado se guarda en el estado: lo recoge `snapshotPrevio`, así que «Deshacer avance» lo restaura.
  - Producir no gasta recursos: solo extracción.
- **Impuestos de locales** (decidido por el usuario el 2026-09-17):
  - Cada local paga cada mes una sola vez. En el paso de cobros, el día de cobro de su tipo actual, el motor cobra los meses del local desde cobradoHasta + 1 hasta el mes anterior, cada uno con su producción, y actualiza cobradoHasta. Si son dos meses, el concepto dice «marzo y abril».
  - Cambiar el tipo de un local o el día de cobro de un tipo no cobra un mes dos veces ni se lo salta. cobradoHasta se guarda en el estado: lo recoge `snapshotPrevio`, así que «Deshacer avance» lo restaura.
  - El mes del alta se cobra entero, sin prorratear. Los meses anteriores al alta no se cobran.
  - La producción de cada mes es la anotada o, si no hay, la habitual. La habitual, el porcentaje y el mínimo son los vigentes el día del cobro, para todo el mes cobrado y sin prorratear. Lo ya cobrado no cambia.
  - Un mes se cobra si el local estuvo Abierto algún día de ese mes (según estadoDesde), con el mínimo entero y sin prorratear. Si estuvo cerrado todo el mes, no paga.
  - Un local con impuesto 0 no cuenta en el cobro. Si ningún local paga ese día, no hay movimiento ni marca «Impuesto locales».
  - El movimiento agrupado lleva `regla: { tipo: locales, id: dominioId }` y `detalleLocales`, con una entrada por local y mes.
  - Los efectos de eventos no se aplican a este impuesto.
  - No hay impagos, porque es un cobro.
  - Anotar la producción de un mes ya cobrado no recalcula el cobro: se corrige su movimiento con J2c.
- **Capacidad**: lo que excede la capacidad al producir o al llegar una caravana se pierde, con aviso ámbar «Se perdieron N …» si ocurre durante un avance o está previsto en 30 días o menos. Las entradas de A8 son lo que entra de verdad, con «se pierden N» debajo.
- **Fórmulas**:
  - Factor diario de un edificio = estado (1 si Activo; 0 si Dañado, Inactivo o Alquilado) × mín(1, asignados ÷ necesarios) (1 si necesarios = 0) × máx(0, 1 + suma de los % de los eventos de producción activos ese día sobre ese edificio o sobre todos).
  - Cantidad de una ocurrencia = cantidad base × (suma de los factores diarios del periodo ÷ días del periodo). Los días del periodo son siempre los de la recurrencia: del día siguiente a la ocurrencia anterior (real o teórica) al día de la ocurrencia, ambos incluidos. Los días del periodo anteriores a `acumulado.desde` cuentan 0, y también los días anteriores al periodo de la primera ocurrencia (sección 7; decidido por el usuario el 2026-09-17).
  - Consumo, costes e ingresos afectados por eventos = base × máx(0, 1 + suma de los %). No se aplica al impuesto de locales.
  - Impuesto de un local en un cobro = máx(porcentaje del tipo × producción del mes anterior, mínimo del tipo). Sin producción anotada, la habitual. El porcentaje × producción se calcula en mh y se redondea al mh (mitades hacia arriba); después se toma el máximo con el mínimo.
- **Vencimientos** (decidido por el usuario el 2026-09-16): el paso 10 suma el interés del día y después marca la deuda como «Vencida», con aviso rojo. No crea movimientos. Los intereses siguen corriendo. Los devengos se guardan en la deuda con su avance.
- **Registros con fecha pasada o de hoy**: nunca se aplican hacia atrás. Efectos de eventos, producción y consumo cuentan desde el día siguiente a la fecha actual. Obras y caravanas calculan progreso y vuelta desde su fecha real; si la vuelta o el fin ya pasaron, se aplican el primer día del siguiente avance.
- **Previsiones**: todas salen de `simular(estadoActual, N)` sin guardar: próximos 7 días, marcas futuras del calendario (hasta el último día del mes que se ve, como mucho 366 días), días de reserva, previsión a 30 días, avisos y cantidades previstas de A7 y A7b (hasta la próxima ocurrencia de cada producción, como mucho 366 días). Si la primera ocurrencia de una producción cae a más de 366 días, A7 y A7b muestran solo su fecha, sin cantidad prevista (criterio por defecto del 2026-09-17; revisable). Estas previsiones y simulaciones se cortan en el 31 de diciembre de 9999: no calculan fechas posteriores (criterio por defecto del 2026-09-17; revisable). En los impuestos de locales, las previsiones usan la producción anotada del mes cobrado si la hay y, si no, la habitual. El equivalente mensual y el balance usan solo la habitual.
- **Días de avance «Otro…»**: de 1 a 366, con aviso ámbar si pasa de 90. El cuerpo de P4 se desplaza, con grupos por dominio.
- **Fecha máxima del avance**: ningún avance (1, 7, 30 u «Otro…») puede pasar del 31 de diciembre de 9999, porque el año máximo de las fechas es 9999 (sección 4). Si la fecha resultante lo pasa, el error «No se puede avanzar más allá del 31 de diciembre de 9999» sale bajo el campo de días y el botón principal se desactiva (decidido por el usuario el 2026-09-17). Fuera de «Avanzar días», las previsiones y los atajos de fecha se cortan en esa fecha (sección 4) (criterio por defecto del 2026-09-17; revisable).
- **Deshacer avance**:
  - Solo el último, y siempre se puede.
  - Restaura `snapshotPrevio` (la partida completa) y descarta lo registrado, editado o eliminado después. El diálogo avisa «Se perderán 3 cambios hechos después del avance» (con Avance.aplicadoEl y el contador de cambios de la partida).
  - J2c avisa: «Si deshaces ese avance, esta edición se perderá.»
  - J2d avisa en oro: «Lo creó el avance del 10 al 12 de abril. Si deshaces ese avance, el movimiento volverá a aparecer.»
  - Las reasignaciones de catálogo (6.6, patrón 5) se aplican también al snapshot.

**Avisos** (tabla única para Inicio, A1, A4, A8, J1, P4, P5 y la barra superior):

| Aviso | Condición | Color | Lleva a |
|---|---|---|---|
| Falta de un recurso | Ocurrida durante un avance, o prevista en 7 días o menos | Rojo | A8 |
| Falta prevista | Entre 8 y 30 días | Ámbar | A8 |
| Impago | Registrado por el motor | Rojo | A2b o J4 |
| Deuda vencida | Estado «Vencida» | Rojo | A2b o J4 |
| Deuda que vence | En 10 días o menos | Ámbar | A2b o J4 |
| Pago no cubierto | El saldo previsto no cubre su siguiente vencimiento | Ámbar | Tesorería o J5 |
| Saldo negativo | Bolsa o caja por debajo de 0 | Rojo | J2 o A2 |
| Obra que no pudo empezar | Obra programada sin dinero o sin materiales | Rojo | A9 |
| Caravana o compra que no pudo salir | Programada sin dinero o sin carga | Rojo | A10 o A8 |
| Edificio terminado sin producción | Obra «Construir edificio» terminada, hasta guardar el edificio en A7b por primera vez o eliminarlo | Ámbar | A7 |
| Mejora terminada | Obra «Mejorar edificio» terminada, hasta guardar el edificio en A7b | Ámbar | A7 |
| Recurso perdido | Lo que excede la capacidad al entrar, ocurrido durante un avance o previsto en 30 días o menos | Ámbar | A8 |

- Se evalúan en la fecha actual (Inicio, A1, A4, A8, J1) o en la fecha final del avance (P4). P5 muestra todos los vigentes al terminar.
- Inicio: primero los rojos; hasta 4 avisos en dos columnas; con más, «Ver todos (N)».
- Barra superior: el aviso rojo más cercano; si no hay, el siguiente elemento del calendario («Mañana: salarios de Bree»); si no hay nada en 7 días, «Nada previsto esta semana».
- Datos del ejemplo:
  - El 12 de abril, los víveres de Bree (se agotan el 23, a 11 días) son **ámbar** en Inicio, A1, A4 y A8. Inicio muestra también «La deuda de 4 mo con Hobart vence el 20 de abril» (ámbar).
  - En P4, P5 e Inicio del 19: víveres en **rojo** (a 4 días), Hobart en ámbar («Mañana vence la deuda de 4 mo con Hobart») y Archet en ámbar («La caja de Archet no cubre el tributo de 60 mo del 19 de julio»).
  - La barra superior del 19 dice «Víveres de Bree: se agotan el 23», con icono de alerta.

**Datos de reservas del ejemplo** (simulación del 13 de abril al 12 de mayo):

- Producción semanal los sábados (14, 21 y 28 de abril; 5 y 12 de mayo): víveres 72 (con las lluvias, hasta el 21) y 90; madera 35; piedra 16,67 (2 de 3 canteros); cerveza 20; lana 12. Las lluvias duran semanas completas de producción (del 8 al 21), así que la proporción no cambia los víveres. Las lluvias se anotaron antes del 8 de abril, así que cuentan desde su primer día (anotadas el mismo 8, el 14 darían unos 75 sacos).
- Producción mensual el día 1: arcilla +6,67 el 1 de mayo (10 carretadas de la cantera con 2 de 3 canteros, del 2 de abril al 1 de mayo).
- La caravana de Tharbad trae +300 sacos el 25.
- Consumo: víveres 41,333 al día; cerveza 3,72 al día; leña 9,92 al día (de la madera).
- Días de reserva, contados hasta el día en que empieza la falta: víveres 11 (23 de abril); cerveza unos 105 días; madera (leña) unos 85 días.
- Día 19: madera 385,56, piedra 196,67, cerveza 83,96, lana 47. A 30 días: madera 297,4, piedra 263,33, arcilla 156,67, cerveza 78,4, lana 95.
- Víveres a 30 días, con el consumo realmente servido: entran 714 y se sirven 975 de los 1.240 sacos del consumo teórico (faltan 265). Falta del 23 al 25 de abril y del 7 al 11 de mayo; el 12 de mayo quedan 49 sacos.

**Datos de impuestos de locales del ejemplo** (Bree; decidido por el usuario el 2026-09-17):

- 4 locales de 3 tipos, todos abiertos y con cobro mensual el día 1 (A3b).
- El 1 de abril se cobró la producción de marzo, que ya está dentro de la caja de 340,6 mo. El calendario marca ese día «Impuesto locales». Los 4 locales tienen cobradoHasta = marzo de 1640.
- Cada local paga cada mes una sola vez: el 1 de mayo el motor cobra abril (de cobradoHasta + 1 al mes anterior) y pasa cobradoHasta a abril.
- Entre el 13 y el 19 no hay cobro de locales, así que P4 y P5 no cambian.
- El 1 de mayo se cobran **+4,5 mo** por abril, con la producción anotada de la Tienda de telas (1,5 mo, paga el mínimo de 0,1 mo). Con la producción habitual serían +4,7 mo. Las previsiones usan esa anotación: el cobro previsto del 1 de mayo es +4,5 mo (A3b).
- Equivalente mensual +4,7 mo, solo con la producción habitual.
- Antes y después del avance: A1, balance «−11,5 mo» con «entran 44 · salen 55,4»; Inicio, solo «Balance mensual −11,5 mo».
- A3 no tiene fila de cifras: «+44 mo al mes» en la cabecera del panel Ingresos, «−25 mo al mes» en la de Tributos y, debajo, la nota «Resultado fiscal: +19 mo al mes (ingresos menos tributos, sin salarios ni guarnición).».
- La tabla de avisos no cambia: los impuestos de locales son cobros y no tienen impagos.

## 10. Sistema visual: pergamino legible

| Token | Valor | Uso |
|---|---|---|
| papel | `#F2E8D0` | Fondo de la app |
| vitela | `#FBF6E9` | Tarjetas y paneles |
| pliegue | `#E6D8B8` | Menú lateral y fondos secundarios |
| borde | `#D4C29C` | Líneas finas |
| tinta | `#2B2118` | Texto principal |
| tinta-suave | `#6B5A45` | Texto secundario |
| lacre | `#8E2A1F` | Avisos urgentes, importes negativos, acción destructiva |
| oro | `#A9812F` | Borde de selección, ornamentos, barras de progreso, campo activo |
| oro-oscuro | `#7A5B1F` | Fondo del botón principal (texto vitela, contraste ≥ 4,5:1) |
| bosque | `#3F5E3A` | Importes positivos, estado correcto |

- **Tipografía**: títulos en *Cormorant Garamond* (600); interfaz y cifras en *Source Sans 3* con números tabulares; *Cinzel* en el nombre de la app y de la partida y en etiquetas de grupo.
- **Tamaños**:
  - Texto de lectura: 15 px.
  - Etiquetas de campo, notas y subtítulos de cifras: 14 px.
  - Etiquetas secundarias, encabezados de tabla y etiquetas de grupo del selector: 13 px.
  - Marcas del calendario mensual: 12 px (única excepción).
  - Cifras clave: 28 px o más.
- **Áreas táctiles** de 44 px o más. El interruptor va dentro de un área de 44 px.
- **Velos**: el de un diálogo, tinta al 55 %; el segundo velo de un diálogo apilado, tinta al 35 %.
- **Ornamento contenido**: filetes dobles en cabeceras de panel y un emblema junto al nombre de la partida.
- Importes alineados a la derecha, con signo y color (bosque o lacre). El equivalente en oro de un campo de importe va sobre fondo oro claro. El color nunca va solo: los estados críticos llevan icono y texto.
- Los movimientos vinculados llevan en la columna Origen un badge oro con icono.

## 11. Fuera de alcance (por ahora)

- Tiradas de dados y reglas de aprendizaje automáticas.
- Días de estudio y estudio por listas de hechizos: el estudio va por hechizo y solo cuenta intentos buenos y malos (decidido por el usuario el 2026-09-17).
- Perfil del máster, sincronización en la nube y multijugador.
- Moral y lealtad, mantenimiento de edificios, cambistas regionales, contratos y recompensas.
- Varios personajes por partida.
- Tipos de víveres distintos (todo se resume en sacos de 30 kg).
- Cambiar la ración de víveres (propuesta aceptada por el usuario el 2026-09-17).
- Ventas del mercado local: la app no las registra, así que no hay impuestos sobre ellas (decidido por el usuario el 2026-09-17). Los negocios del asentamiento pagan con el impuesto de locales comerciales (A3b).
- Producción de los locales comerciales en recursos: su producción es dinero y no entra en el almacén (decidido por el usuario el 2026-09-17).
- Compra y venta automática de animales y de equipo de la armería: el dinero se anota aparte (propuesta aceptada por el usuario el 2026-09-17).
- Pago automático de deudas al vencer (decidido por el usuario el 2026-09-16).
- Transformación de materias primas con insumos (por ejemplo, hierro y carbón → herramientas): fuera de alcance; se ajustan existencias a mano (decidido por el usuario el 2026-09-17).
- Deshacer avances anteriores al último.
- Convertir las cantidades al cambiar la unidad de un recurso.
- Orientación vertical y pantallas menores de 1024×700.
- Modo oscuro.

## 12. Entregables de esta fase

1. Este documento.
2. Un único canvas de diseño dividido en tres páginas —**Partida** (10), **Personaje** (15) y **Asentamiento** (24)— con **49 artboards** de 1180×820. Todos usan el mismo estado de ejemplo: la partida «La Sombra del Este», con fecha inicial el domingo 1 de enero de 1640 T.E., vista el jueves 12 de abril de 1640 T.E., y un avance de 7 días hasta el jueves 19.

| Página | Artboards |
|---|---|
| Partida (10) | P0 SelectorPartidas · P1 NuevaPartida · P1b NuevaPartidaPersonaje · P2 Main · P3 Calendario · P4 AvanzarDiasPrevia · P5 AvanzarDiasResumen · P6 Ajustes · P7 ListasYCatalogos · P7b ListasEliminarCategoria |
| Personaje (15) | J1 PersonajeResumen · J2 PersonajeBolsa · J2b PersonajeNuevoMovimiento · J2f PersonajeTransferencia · J2c PersonajeEditarMovimiento · J2e PersonajeNuevaCategoria · J2d PersonajeEliminarMovimiento · J3 PersonajeInventario · J3b PersonajeVenderObjeto · J4 PersonajeDeudas · J4b PersonajeRegistrarPago · J5 PersonajeGastos · J6 PersonajeInversiones · J7 PersonajeHechizos · J8 PersonajeRegistrarIntento |
| Asentamiento (24) | A0 NuevoAsentamiento · A1 BreeResumen · A2 BreeTesoreria · A3 BreeImpuestos · A3b BreeLocales · A3c BreeProduccionLocal · A2b BreeDeudas · A4 BreePoblacion · A5 BreeTrabajadores · A6 BreeGuarnicion · A6b BreeArmeria · A7 BreeEdificios · A7b BreeEditarEdificio · A8 BreeAlmacen · A8b BreeAnadirViveres · A9 BreeObras · A9b BreeNuevaObra · A12 BreeAnimales · A12b BreeNuevoAnimal · A10 BreeComercio · A10b BreeNuevaCaravana · A10c BreeNuevoMercado · A11 BreeEventos · A11b BreeNuevoEvento |

**Anotaciones del canvas**. Los estados que no tienen artboard van como anotación junto a su vista:

| Junto a | Estados anotados |
|---|---|
| Notas de cada página | Las altas: pie del buscador, alta rápida sobre el teclado, alta completa apilada, y gestión y reasignación en P7 |
| P0 | Estado vacío con «Nueva partida» e «Importar copia» destacados; importar una partida que ya existe («Reemplazar» o «Importar como copia») |
| P2 | Hasta 4 avisos en dos columnas, con «Ver todos (N)»; colores según la tabla de avisos (sección 9); tocar una tarjeta abre su Resumen |
| P3 | Qué abre editar en el detalle del día (movimiento o su origen, regla con «Cambia esta y las próximas ocurrencias», producción futura en A7b sin ese aviso, evento, intento, deuda; la producción pasada y los avisos previstos no se editan); tarjeta de producción por edificio («Cantera · piedra 17 · arcilla 7 carretadas»); impuestos de locales: una marca «Impuesto locales» y una tarjeta por asentamiento y día, aunque cobren varios tipos («Impuestos de locales · marzo (4)» · Bree); editar abre J2c de su movimiento, con el detalle, si es pasado, o A3b, sin el aviso «Cambia esta y las próximas ocurrencias», si es futuro (decidido por el usuario el 2026-09-17); evento de partida (propuesta aceptada por el usuario el 2026-09-17) |
| P4 | «Otro…» de 1 a 366 días, con aviso ámbar si pasa de 90; «Se añadirá «Trabajadores de Bree» a Personas y entidades» |
| P5 | «Deshacer avance» con «Se perderán 3 cambios hechos después del avance» |
| P7 | Otras listas: oficios, tipos de edificio, de unidad y de animal (nombre, grupo, Se usa en, Origen); tipos de defensa sin grupo; recursos con la unidad bajo el nombre y «Bree 180 · Archet —» (Víveres, Cerveza, Madera, Piedra y Arcilla con candado); ubicaciones (Posada El Poney Pisador y Establo de Bree con 1 objeto; Encima, cajas y almacenes en tono suave con «Sale del dominio»); las 6 personas y entidades (Gremio de mercaderes de Bree · 2 deudas · 72 mo pendientes: 42 de Tharan y 30 de Bree; Hobart Brezal, herrero · 1 deuda · 4 mo · titular de 1 local; Dalen, mercader de Esgaroth · 1 préstamo · 15 mo; Corona de Arthedain · 2 tributos: Bree y Archet; Joyero de Bree · sin usos; Barnabás Mantecona, posadero · 1 deuda saldada, de Bree · titular de 1 local); «Editar categoría» y «Recurso del catálogo» |
| P7b | Recién abierto (campo vacío, «Elige una categoría», botón rojo desactivado); sin usos (J2d normal); uso opcional (Corona de Arthedain, «Dejarlos sin destinatario»); bloqueos con su motivo (Salarios, Madera, Hierro); tipo de animal con la misma combinación de tipo y género en el destino (6 cabras montesas hembra se suman a «Cabra · Hembra», que pasa a 12; valor por cabeza con segmentos; «Valor anotado de los animales: 486,8 → 485,6 mo»); opción de la app usada en varias partidas |
| J2b | El patrimonio no cambia: 12 mo pasan de la bolsa al inventario; «Añadir también al inventario» solo con «Gasto»; suma a una fila existente (mismo nombre, ubicación y valor por unidad); movimiento con fecha futura, que queda programado (el objeto se crea al aplicarse) |
| J2f | Sin saldo negativo: pie «Cancelar» y «Transferir»; «Revisar» vuelve al formulario; aviso rojo en Inicio («La bolsa de Tharan está en negativo: −3,482 mo»); editar y eliminar los dos movimientos desde cualquiera de ellos |
| J2c | Selector buscando «posada» (sin resultados, «Busca en todas las categorías y grupos.» y botón principal «+ Nueva categoría “posada”»); buscando «alojamiento» (pie «“Alojamiento” ya existe», sin acción); filtros de J2, A2, J3 y A12 sin pie; con teclado (el diálogo sube hasta dejar el campo a 88 px del borde y el panel mide como mucho 440 − 88 − 56 = 296 px); movimiento vinculado que abre su origen |
| J2e | Vacío («Escribe un nombre» y botón desactivado); duplicado («alojamiento»: «Ya existe «Alojamiento» en Gastos del personaje.» y «Elegir «Alojamiento»»); parecida («Salario»: «Parecida: «Salarios» (Asentamientos)» con «Elegir esa»); con grupo («Nuevo tipo de animal» desde A12b: «Cabra montés», parecido «Cabra», Grupo «Ovino y caprino», ≈440 px); Oficio («Tonelero» / «Toneleros» y los 4 segmentos de grupo); tras crear (J2c con la categoría, borde oro, ayuda y «La bolsa queda en 46,118 mo»); la categoría queda aunque se cancele J2c |
| J2d | Casillas de devolución (obra en curso, caravana en ruta, «Quitar también las 3 athelas del inventario»); cancelar reabre el formulario |
| J3 | Filtro activo con «Valor de lo filtrado: X mo de 81,6 mo»; filtro «Vendidos»; la lupa busca en nombre y notas |
| J3b | Cantidad mayor que la que tienes: error bajo el campo y «Vender» desactivado; editar la venta desde el libro, con «Eliminar», que devuelve las unidades |
| J4 | Deuda vencida; grupo «Saldadas» desplegado: tarjetas atenuadas con badge «Saldada el …» y editar (en el ejemplo, visible solo en A2b); formulario de deuda con la lista de Pagos |
| J5 | Formulario de gasto o ingreso e interruptores en línea (propuesta aceptada por el usuario el 2026-09-17) |
| J6 | Campo Negocio en «Nueva inversión»: buscando «molino de entibo», «Nada coincide» y «+ Nuevo negocio “molino de entibo”»; después, «Molino de Entibo» con la etiqueta «nuevo» y el foco en Descripción. Grupo «Retiradas» |
| J7 | Formulario «Hechizo» (nombre, lista, reino, nivel, estado y notas; con Estado «Aprendido» pide «Aprendido el», que no puede ser anterior al último intento y se borra al volver a «En estudio»); eliminar un hechizo con J2d (se borran sus intentos; sus pergaminos se conservan, sin hechizo, con su nombre y su fecha de consumo, y sus objetos siguen en el inventario); formulario «Pergamino» sin hechizo («Nombre del pergamino») (decidido por el usuario el 2026-09-17) |
| J8 | Fecha futura (error); casilla «El pergamino se consume» activa con un pergamino elegido y «Pergamino usado» con los grupos «De este hechizo · Otros»; «+ Nuevo hechizo “…”» desde J8, que abre el alta rápida (Nombre; va a «En estudio»; lista, reino y nivel se completan en el hechizo); búsqueda que coincide con un hechizo Aprendido («“Hablar con los animales” está aprendido», sin acción) y su alta rápida («Crear y elegir» desactivado); J8 en edición desde J7 o P3 (hechizo Aprendido del intento, pergamino que consumió y «Eliminar») (decidido por el usuario el 2026-09-17) |
| A2 | Grupo «Programados» y saldo inicial en la primera fila; estado vacío |
| A2b | Registrar pago con «Sale de: caja de Bree»; impago del asentamiento |
| A3b | Formulario «Local comercial» (nombre, tipo con altas, titular opcional, producción habitual, estado Abierto · Cerrado, notas y «Eliminar»); formulario «Tipo de local» (nombre, impuesto %, mínimo al mes y día de cobro; eliminar bloqueado con locales: «Herrería tiene 1 local: cámbialo de tipo antes»; con locales, aviso «Vale desde el próximo cobro (1 de mayo), también para la producción de abril»); un local cerrado todo el mes no paga; varios días de cobro («y el 15 de mayo: +X mo», «se cobra el 1 y el 15 de mayo») (decidido por el usuario el 2026-09-17) |
| A3c | Producción vacía: cuenta la habitual (10 % de 10 mo = 1 mo, se cobra +1 mo); producción 0: no produjo y paga el mínimo (+0,2 mo); el selector de mes solo ofrece los meses sin cobrar del local, desde cobradoHasta + 1 (nunca antes del mes de su alta) hasta el mes actual, con el actual primero y sin meses futuros; mes cerrado entero («Cerrado todo el mes: no paga»); un mes ya cobrado no se recalcula: se corrige su movimiento con J2c (decidido por el usuario el 2026-09-17) |
| A5 | Sobredotación hipotética con 4 canteros: aviso ámbar «La cantera tiene 1 cantero de más» |
| A7b | Ejemplo de la mina del usuario (10 carretadas al mes; 15 días con 2 de 3 mineros y 15 con 3 → 10 × (15 × 2/3 + 15 × 1) ÷ 30 ≈ 8,3; el resumen dice «unas 8 carretadas»); «Alquilado» oculta Producción y muestra la renta en solo lectura con el enlace «en Impuestos y rentas» (decidido por el usuario el 2026-09-17); «Alquilado» sin renta enlazada («Sin renta · Añádela en Impuestos y rentas»); quitar una producción (fila marcada como quitada, resumen «Se descartan 11 días acumulados de arcilla», «Guardar cambios» lo confirma y «Cancelar» la recupera; propuesta aceptada por el usuario el 2026-09-17); cambio de frecuencia de semanal a «Mensual · día 1» el 29 de abril con 2 de 3 canteros (el 1 de mayo, 10 × 2 × 2/3 ÷ 30 ≈ 0,4 carretadas) |
| A8 | Formulario del recurso con la lista de ajustes y recepciones; «Añadir existencias» con otro mercado (crea caravana) y capacidad superada |
| A8b | «Sacos» en lugar de «Por personas»; otro mercado con «Enviar caravana» |
| A9 | Obras programadas: «Empezar obra» con inicio futuro deja la obra «Programada», que no descuenta nada hasta su inicio y, si ese día falta dinero o materiales, no empieza y da aviso rojo |
| A9b | «Nuevo recurso» (alta completa de 700 px: Nombre «Cal», unidad «carretada» / «carretadas» con chips, Existencias en Bree 0, Capacidad «Sin límite», sin precio; tras crear, «Cal · 20 carretadas · Hay 0» en lacre, y la fila del almacén se crea al guardar la obra; desde una caravana de compra, «Entrarán al volver la caravana: 20 carretadas»); estado de insuficiencia («Faltan 20 carretadas de cal», «Empezar obra» desactivado); saldo negativo con confirmación |
| A10b | Traslado (propuesta aceptada por el usuario el 2026-09-17); venta en el mercado local con 0 días |
| A10c | Tras crear (Nueva caravana con «Cavada Grande · 5 días de viaje», «Mercado nuevo · edítalo en Comercio», «Víveres · 0,28 mo el saco», «Vuelve el 22 de abril», «Se paga al salir −28 mo», «La caja queda en 312,6 mo», «Días con falta de víveres hasta el 25: de 3 a 0 días»; columna «Cavada Grande» en A10); errores (nombre «fornost», días «0», precio vacío); cancelar con cambios; el selector de «Añadir precio» sin «Nuevo recurso» |
| A12b | Suma a una fila existente («Se sumarán 6 a tus 24 vacas» y segmentos de valor por cabeza) |

## 13. Propuesta técnica (a validar en el plan de implementación)

Aplicación web instalable (PWA) con React + TypeScript + Vite, almacenamiento en IndexedDB y el motor de avance como módulo puro con pruebas unitarias. Los importes, como enteros en unidad base con utilidades de conversión probadas.
