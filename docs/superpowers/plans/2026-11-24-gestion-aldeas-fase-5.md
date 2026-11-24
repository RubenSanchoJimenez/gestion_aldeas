# Gestión de Aldeas · Fase 5 · Motor III: personaje

> **Para agentes:** este plan es **compacto a propósito**. Desde el 2026-11-24 Claude trabaja en sesión, sin subagentes (`CLAUDE.md`), así que el plan fija reglas, firmas y cifras, y el código se escribe al implementar, con TDD y un commit por tarea. No lleva bloques de código completos como los planes de las fases 2 a 4.

**Objetivo:** cerrar el motor con lo que le falta del personaje: deudas (intereses, pagos, vencimiento), inversiones, inventario y ventas, patrimonio, y el estudio de hechizos con sus intentos y pergaminos.

**Arquitectura:** sigue todo en `src/dominio`, puro. Reglas de cálculo en módulos nuevos (`deudas/`, `personaje/`); el paso 10 del día en `motor/pasos/deudas.ts`, registrado en `PASOS_DEL_DIA`; los avisos en `avisos/deudas.ts`, sumados en `avisosEn`; la edición y el borrado en `edicion/`, con el patrón ya usado (`Sello`, `Creado<E>`, `contarCambio`, `reemplazarPorId`, `quitarPorId`).

**Tecnología:** la de siempre; no hace falta ninguna dependencia nueva. `VERSION_FORMATO` sigue en 1: el modelo de la fase 2 ya tiene todas las entidades (`Deuda`, `PagoDeuda`, `Devengo`, `ObjetoInventario`, `Venta`, `Inversion`, `Hechizo`, `IntentoAprendizaje`, `Pergamino`) y los tipos de aviso `deudaVencida` y `deudaQueVence`.

**Punto de partida:** 1.263 pruebas en 100 archivos (fin de la fase 4), con `npx tsc -b`, `npm test`, `npm run lint` y `npm run build` en verde. Rama `implementacion/fase-5` desde `diseno/especificacion-y-vistas`.

## Qué entra y qué no

Entra el alcance de la hoja de ruta para la fase 5: devengos, pagos con «Se aplica a», vencimiento como aviso e impagos; inversiones (beneficios ya cobrados por la fase 3, más la retirada); inventario, ventas y archivado; patrimonio; estudio por hechizo con intentos, conteos y pergaminos; y la edición y el borrado de todos esos registros según «Al eliminar» (§6.4).

No entra: nada de pantallas (fases 6 a 9), ni el pago automático al vencer (está en «Fuera de alcance», esp l.1419), ni días de estudio (el usuario los quitó el 2026-09-17: no hay paso de estudio en el motor).

## Reglas que manda la especificación

- **Deudas** (esp l.1160-1166): un pago se aplica según «Se aplica a» (por defecto, primero intereses y después capital). El interés periódico se calcula **sobre el capital pendiente** y cada interés sumado queda como devengo (fecha, importe, avance); un pago con fecha anterior a un devengo no lo recalcula. **Vencimiento solo avisa**: ese día, primero el interés y después el vencimiento; la deuda pasa a «Vencida» y los intereses siguen corriendo. Saldada cuando no queda nada pendiente. Alta con dinero: movimiento vinculado de «Préstamos y deudas»; con «Ninguno: solo anotar la deuda», no mueve dinero.
- **Paso 10 del día** (esp l.1282, l.1320): «Intereses y vencimientos de deudas: primero el interés del día y después el vencimiento». No crea movimientos.
- **Avisos** (esp l.1339-1340): «Deuda vencida» en rojo con estado «Vencida»; «Deuda que vence» en ámbar si vence en 10 días o menos. Textos: «Venció la deuda con Hobart: 4 mo pendientes»; en un préstamo, «Dalen no ha devuelto 15 mo»; «La deuda de 4 mo con Hobart vence el 20 de abril» y, el día antes, «Mañana vence la deuda de 4 mo con Hobart» (esp l.285-286, l.1353-1354).
- **Patrimonio** (esp l.1056): bolsa + inventario sin archivados + capital completo de las inversiones activas + lo que te deben − lo que debes (pendiente con intereses), contando solo las deudas del personaje.
- **Ventas** (esp l.1169-1173): entra el precio y sale el valor anotado; no se puede vender más de lo que hay; vender todas las unidades archiva el objeto como «vendido» y la venta guarda su nombre y su valor anotado; eliminar la venta borra su movimiento y devuelve las unidades.
- **Inventario y pergaminos** (esp l.1174-1186): el objeto de un pergamino tiene cantidad 1 y se llama «Pergamino «X»»; vender el objeto marca el pergamino «vendido» y eliminar la venta lo devuelve a «poseído»; consumir o perder archiva su objeto en vez de borrarlo; renombrar el hechizo renombra sus pergaminos y los objetos que todavía se llamen «Pergamino «nombre anterior»», sin tocar los conceptos de los movimientos ya registrados; eliminar un intento que consumió un pergamino, o cambiarlo, lo devuelve a «poseído» y restaura su objeto; comprar un pergamino crea el movimiento vinculado de «Pergaminos y estudio».
- **Estudio** (esp l.1187-1200): por hechizo, sin contar días; nombre único en el personaje; la fecha de un intento es hoy o antes, aunque sea anterior al alta del hechizo; «Aprendido el» es obligatorio con «Aprendido», no posterior a hoy ni anterior al último intento, y se borra al volver a «En estudio»; al editar un intento de un hechizo aprendido, su fecha no puede ser posterior a «Aprendido el»; eliminar un hechizo borra sus intentos y deja sus pergaminos sin hechizo.
- **Al eliminar** (esp l.779-780 y la tabla de §6.4): al borrar una deuda se borran sus pagos y los movimientos de esos pagos y de su alta; al borrar un pago se borra su movimiento y se recalculan capital e intereses pendientes, sin tocar los devengos.
- **D-043** (`docs/decisiones.md`): la deuda de impago es por origen **y por caja**; si un gasto recurrente cambia de «Sale de», los impagos nuevos van a otra deuda en la caja nueva.

## Cifras que hay que reproducir (comprobadas a mano en mh)

| Oráculo | Cifra |
|---|---|
| O1 · Deuda del Gremio el 12/4 | capital 40 mo (4.000.000), intereses devengados 2 mo (200.000), pendiente 42 mo (4.200.000) |
| O2 · Patrimonio de Tharan (J1) | 4.651.800 + 8.160.000 + 7.000.000 + 1.500.000 − 4.600.000 = **16.711.800 mh** («167,118 mo») |
| O3 · J4b, pago de 15 mo al Gremio | intereses y capital: 2 mo a intereses y 13 a capital → capital **27 mo**, pendiente 27 mo, próximo interés **1,35 mo** (5 % de 27), bolsa 46,518 − 15 = **31,518 mo** |
| O4 · J3b, vender 1 jarrón de 12 mo por 11 mo | bolsa 46,518 + 11 = **57,518 mo**; patrimonio 167,118 + 11 − 12 = **166,118 mo**; quedan 1 de 2 unidades, sin archivar |
| O5 · Vencimiento del Gremio (1/5) | ese día primero el interés (5 % de 40 = 2 mo) y después vence: pendiente **44 mo** y estado «vencida» |
| O6 · Avisos el 12/4 | ámbar «La deuda de 4 mo con Hobart vence el 20 de abril»; el préstamo del Gremio (12 días) todavía no avisa |
| O7 · Avisos el 19/4 | ámbar «Mañana vence la deuda de 4 mo con Hobart» |
| O8 · Conteos de J7 | los del ejemplo: intentos buenos y malos por hechizo, y los pergaminos por estado |

## Las 13 tareas

Cada tarea deja el proyecto en verde (`npx tsc -b`, `npm test`, `npm run lint`) y termina con su commit. Al acabar cada bloque de 4 o 5, revisión propia leyendo el código.

| # | Tarea | Crea o modifica | Qué prueba |
|---|---|---|---|
| 1 | **Estado de una deuda** | `deudas/pendiente.ts` | Del ejemplo: Gremio capital 40 mo, intereses 2 mo, pendiente 42 mo, pagado 20 mo (O1); Hobart 4 mo sin intereses; Dalen 15 mo a favor. Saldada cuando pendiente 0; un pago mayor que el pendiente no deja negativos; los devengos no se recalculan al pagar antes de su fecha |
| 2 | **Aplicar un pago** | `deudas/pago.ts` | Los tres «Se aplica a» con el Gremio: intereses y capital (O3), solo capital, solo intereses; vista previa con capital e intereses antes y después, pendiente, próximo interés y bolsa resultante; un pago que salda la deuda la pasa a «saldada» |
| 3 | **Paso 10 del día** | `motor/pasos/deudas.ts`, `motor/bucle.ts` | El interés del día crea un devengo con la fecha y el avance, sobre el capital pendiente; el día del vencimiento, primero el interés y después el estado «vencida» (O5); una deuda saldada no devenga; sin `recurrenciaInteres` no hay devengos; el paso no crea movimientos |
| 4 | **Avisos de deudas** | `avisos/deudas.ts`, `avisos/avisos.ts` | Vencida en rojo con su texto, y los dos sentidos; «vence en 10 días o menos» en ámbar, con «Mañana vence…» el día antes (O6, O7); una deuda saldada no avisa; el orden que ya fija `ordenarAvisos` |
| 5 | **Impago por caja (D-043)** | `motor/impagos.ts`, `validacion/unicidades.ts` | Dos cajas con el mismo origen llevan dos deudas de impago; la unicidad pasa a origen + caja; la deuda vieja no recibe los cargos de la caja nueva |
| 6 | **Patrimonio** | `personaje/patrimonio.ts` | O2 con el ejemplo, y su desglose fila a fila; los objetos archivados y las inversiones retiradas no cuentan; las deudas de un asentamiento no entran |
| 7 | **Deudas: alta, edición y borrado** | `edicion/deudas.ts` | Alta con dinero (movimiento vinculado de «Préstamos y deudas») y «solo anotar»; registrar un pago crea su movimiento y recalcula; editar y borrar un pago (se borra su movimiento, los devengos no cambian); borrar la deuda borra sus pagos y los movimientos de los pagos y del alta |
| 8 | **Ventas de objetos** | `edicion/ventas.ts` | O4; no se puede vender más de lo que hay; vender todas archiva el objeto como «vendido» y la venta guarda nombre y valor anotado; eliminar la venta borra el movimiento, devuelve las unidades y restaura el archivado; si el objeto es de un pergamino, pasa a «vendido» y vuelve a «poseído» al eliminar |
| 9 | **Objetos del inventario** | `edicion/objetos.ts` | Crear, editar (nombre, cantidad, valor, ubicación, notas) y borrar; archivar y restaurar con su motivo; borrar un objeto quita el `movimientoCompraId` de su movimiento |
| 10 | **Inversiones** | `edicion/inversiones.ts` | Crear con su capital (movimiento vinculado), editar, retirar (movimiento de la retirada y estado «retirada») y borrar; una retirada no cuenta en el patrimonio |
| 11 | **Hechizos e intentos** | `edicion/hechizos.ts` | Nombre único con su mensaje; crear, renombrar, marcar «Aprendido» con sus tres validaciones de fecha y volver a «En estudio»; intentos (fecha hoy o antes, editar, borrar) y los conteos de O8; borrar el hechizo borra sus intentos y deja sus pergaminos sin hechizo |
| 12 | **Pergaminos** | `edicion/pergaminos.ts` | Crear con y sin hechizo (nombre copiado o escrito), con su objeto de cantidad 1 y «Lo he comprado» (movimiento de «Pergaminos y estudio»); consumir en un intento, perder, restaurar al deshacer el intento o cambiarlo; renombrar el hechizo renombra pergaminos y objetos; borrar un pergamino usado deja el intento «con un pergamino eliminado» |
| 13 | **Entregable y cierre** | `personaje/entregable.test.ts` | O1 a O8 con la partida de ejemplo, el documento sigue válido tras cada operación (`validarCopia`), ninguna operación muta la entrada congelada, y las cuatro órdenes en verde |

## Avisos para quien lo ejecute

1. **Coma flotante:** nada de `toEqual` sobre cantidades calculadas; en mh todo es entero, así que compara enteros y usa `toBeCloseTo(x, 3)` solo donde haya fracciones.
2. **El ejemplo no cambia.** Las pruebas llaman a `documentoDeEjemplo()` para tener un estado limpio y nunca escriben en él; `congelar` del constructor de pruebas comprueba que no se muta la entrada.
3. **Patrón de edición:** todas las funciones de `edicion/` devuelven el estado nuevo (o `Creado<E>`), dejan la misma referencia si nada cambia, sellan con `editadoEl` y suman un cambio con `contarCambio`. Los movimientos vinculados se crean y se borran con los ayudantes de `edicion/movimientos.ts`.
4. **No inventar reglas.** Si aparece una duda que ni la especificación ni `docs/decisiones.md` resuelven, se decide y se anota como D-100 en adelante.
5. **Las deudas de impago** no se editan a mano como las demás: su principal es la suma de sus cargos.

## Lo que queda para las fases siguientes

- **6a** (base de la interfaz) y **6b** (Inicio, calendario, avanzar días) usan `patrimonio`, los avisos y las funciones de edición de esta fase.
- **7** (pantallas del personaje) pinta J1 a J8 sobre lo que deja esta fase: no debería necesitar lógica nueva de dominio, salvo los formatos de fecha que faltan («viernes 13 de abril», «Abril de 1640 T.E.», «Del 12 al 19 de abril»).
- El **pago automático al vencer** sigue fuera de alcance (esp l.1419).
