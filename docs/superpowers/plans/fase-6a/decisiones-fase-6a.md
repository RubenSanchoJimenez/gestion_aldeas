# Fase 6a · Decisiones

Decididas el 2026-09-18 con el criterio de `CLAUDE.md` («Cómo decidir»): primero la especificación y las vistas, luego `docs/decisiones.md`, luego lo más simple que cumpla las reglas y, por último, lo más fácil de cambiar. Ninguna toca una decisión marcada «decidido por el usuario».

**Numeración.** La fase 4 usa hasta la D-079. La 6a se queda el bloque **D-080 a D-099** y lo llena entero. Como la 6a se fusiona después de las fases 3 a 5, la fase 5 debería empezar en la **D-100** para no chocar.

**Fuentes que se citan.** «espec. L…» es `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`; «mjs L…» es `design/build-artboards.mjs`, que genera las vistas `.dc.html`. El código citado es el de la rama de trabajo `diseno/especificacion-y-vistas` (3a77322), de la que sale la 6a.

---

## (a) Para el registro

Estas son las decisiones que cambian lo que ve el jugador o las reglas. Van a `docs/decisiones.md` en una sección nueva: «Fase 6a · Interfaz base (2026-09-18)».

| # | Decisión | Por qué |
|---|---|---|
| D-080 | Los asentamientos salen en el menú y en las tarjetas del selector de partidas por su fecha de alta y, si empatan, en el orden en que los creaste. | Así el ejemplo dice «Tharan, Bree y Archet», como las vistas. Hasta ahora el empate lo decidía un identificador interno. |
| D-081 | Mientras falten Inicio (fase 6b) y las demás pantallas de la partida, al abrir o crear una partida se ve el marco con una pantalla provisional: «Esta pantalla llega en una fase posterior.» y un botón «Ir a Ajustes y copias». Las entradas del menú que aún no tienen pantalla, «Añadir asentamiento» y «Gestionar listas» llevan a esa misma pantalla y no se desactivan. | Cada fase solo tiene que cambiar la pantalla provisional por la de verdad. |
| D-082 | El selector de partidas tiene un botón «Probar con la partida de ejemplo» mientras «La Sombra del Este» no esté guardada en la tablet. El botón la guarda y la abre. | La vista no lo dibuja, y sembrar el ejemplo sin avisar rompería «Sin partidas, muestra P0 vacío». |
| D-083 | Selector de partidas vacío: la frase «Todavía no tienes ninguna partida.» con «Nueva partida» (botón principal), «Importar copia» y el botón del ejemplo, centrados. | La especificación pide los dos botones destacados y una frase breve, pero no escribe la frase. |
| D-084 | Con más de 5 partidas aparece un buscador por nombre, que no distingue mayúsculas ni tildes. Si no encuentra nada, dice «Nada coincide con “…”». El botón «Continuar» sigue en la última partida usada aunque la búsqueda la esconda. | Es el buscador de §6.5 (n.º 31), sin contador ni grupos, que una lista de partidas no necesita. |
| D-085 | «Nueva partida» empieza con el día 1, enero, el año vacío y la Edad «Tercera». El aviso «La partida empieza el …» solo sale cuando la fecha está completa y es válida. «Cancelar» vuelve al selector sin preguntar, porque aún no se ha guardado nada, y «Atrás» conserva lo escrito. | La vista enseña «Tercera». Un año sugerido parecería el año real. |
| D-086 | «Editar equivalencias» vuelve editable la tabla de monedas dentro del propio paso, sin diálogo, y la cadena «1 mm = 100 mo · …» se recalcula al teclear. Si hay algún error, en lugar de la cadena salen los mensajes y «Siguiente: personaje» se desactiva. | Es lo que pide la especificación: la tabla editable en el propio paso, con vista del resultado. |
| D-087 | La bolsa inicial empieza con una fila vacía en oro, y «Añadir otra moneda» añade otra en oro. Una fila sin cantidad no cuenta ni da error. Se pueden quitar todas: la bolsa queda en 0 mo. | Un personaje puede empezar sin dinero, y así no hace falta borrar filas vacías. |
| D-088 | El nombre de la partida y el del personaje se guardan sin espacios al principio ni al final. Si falta, sale «Escribe un nombre», y el campo no deja pasar de 60 letras. Puede haber dos partidas con el mismo nombre. La descripción del personaje es opcional, de una línea y de hasta 1.000 letras. | «Escribe un nombre» es el texto de J2e y el límite de 60 es el de D-014. Dos partidas iguales ya se distinguen con «(copia)». |
| D-089 | «Editar partida» tiene los campos de P1: nombre, día, mes, año y Edad. Después del primer avance, la fecha y la Edad salen desactivadas, con «Solo se pueden cambiar antes del primer avance.». Al cambiar la fecha inicial se mueven con ella la fecha actual y el alta de los asentamientos. Si algún otro registro quedara fuera de la partida, no deja guardar: «La fecha inicial no se puede cambiar: algún registro quedaría fuera de la partida». Guardar con algún cambio cuenta como un cambio (D-038). | Lo pide la especificación, y la fecha actual nunca puede ser anterior a la inicial. |
| D-090 | Borrar una partida, desde «Editar partida» o con «Borrar partida» en Ajustes, abre la doble confirmación J2d. Lleva «¿Eliminar «La Sombra del Este»?», «Partida · 12 de abril de 1640 T.E.», un resumen con sus dominios y la última copia exportada, «Se borra todo y se vuelve al selector de partidas.», la casilla y «Eliminar definitivamente». Su «Cancelar» vuelve a «Editar partida» con lo escrito. | Sigue la vista de J2d y la tabla «Al eliminar»: «Se borra todo y se vuelve a P0». |
| D-091 | Al importar una partida que ya tienes sale «¿Reemplazar «…»?», con «Copia exportada el 8 de septiembre de 2026», una frase que explica qué se pierde y los botones «Cancelar», «Importar como copia» y «Reemplazar» (en rojo). En Ajustes es lo mismo, sin «Importar como copia». | La especificación pide que las confirmaciones expliquen qué se pierde y ofrezcan la acción en rojo. |
| D-092 | Al terminar de importar sale «Copia importada» con las líneas del resumen: qué se añadió, si se actualizó el formato y cómo se unieron los catálogos. Si la copia no vale, sale «No se ha podido importar» con el motivo, y una copia dañada dice «La copia está dañada: <detalle>». Otros fallos: «No se ha podido abrir la partida» y, para lo inesperado, «Algo ha fallado» con su explicación. | La especificación dice «el resumen lo dice», y D-006 exige un mensaje en castellano que explique qué falla. |
| D-093 | Las fechas reales (última sesión y última copia exportada) van en la hora de la tablet: «8 de septiembre de 2026». Sin ninguna copia exportada, «Nunca». Las fechas de la partida van así: en la barra superior, «12 de abril de 1640 T.E.» y aparte el día con mayúscula, «Jueves»; en P1, «domingo 1 de enero de 1640 T.E.», sin coma; en Ajustes, «Jueves, 12 de abril de 1640 T.E.». | Son las formas de las vistas. Cierra en parte el pendiente «Formas de fecha». |
| D-094 | Un campo de un formulario no enseña su error hasta que lo tocas. El botón principal, en cambio, está desactivado desde el principio si falta algo. Un campo con error lleva además el borde en lacre. | La especificación no dice cuándo aparece el mensaje ni si el borde cambia. |
| D-095 | En el campo de frecuencia, los tipos se agrupan en «Habituales» (Cada día, Semanal, Cada dos semanas, Mensual, Trimestral, Anual) y «Personalizadas» (Cada N días, Cada N meses, Una sola vez). Valores de partida: N empieza en 2; el día de la semana, el día del mes y el mes empiezan con los de la fecha actual; «Una sola vez» empieza en mañana. «Primera vez» se recalcula también al cambiar N en «Cada N días». Debajo del campo sale «Próxima: sábado 14 de abril de 1640 T.E.» o «Próxima: ninguna». Una fecha que no sea posterior a la actual da «Tiene que ser posterior al 12 de abril de 1640 T.E.». | La especificación da las reglas, pero no los valores de partida ni estos textos. |
| D-096 | Ninguna fecha que proponga la app (atajos, «Primera vez» o «Una sola vez») pasa del 31 de diciembre de 9999. Si no cabe, se queda en esa fecha y el campo da su error normal. | Extiende D-001 a los formularios. Cierra la parte de formularios de «Ocho casos límite»; la de las previsiones queda para la 6b. |
| D-097 | En el campo de fecha se puede escribir «19/04/1640». Si no se entiende lo escrito, sale «Escribe la fecha como 19/04/1640»; si pasa del último día, «No puede pasar del 31 de diciembre de 9999». Las semanas empiezan en lunes y los atajos que se salen del rango permitido no aparecen. | Lo pide la especificación; los dos mensajes son nuevos. |
| D-098 | La app instalada se llama «Gestión de Aldeas» («Aldeas» bajo el icono). Su icono es el emblema de oro sobre papel. Se abre en horizontal y a pantalla completa, se actualiza sola cuando hay una versión nueva y pide al navegador que no borre sus datos. | La especificación fija la tablet en horizontal (§2) y el emblema ya está dibujado en las vistas. |
| D-099 | En la fase 6a, la tablet abre la app desde el ordenador por USB (`adb reverse`, en la dirección `localhost`). Antes de la primera partida de verdad hay que elegir un sitio HTTPS fijo, como GitHub Pages u otro. Publicarla se te pregunta antes, y cambiar después de sitio obliga a exportar e importar las partidas. | Chrome solo instala una app y la deja usar sin conexión si viene de HTTPS o de `localhost`, y las partidas quedan guardadas en ese sitio. |

### De dónde sale cada una

- **D-080**: `resumenDePartida` desempata por id (`src/dominio/modelo/resumen.ts` L85), así que el ejemplo daría «Tharan, Archet y Bree». Se ha comprobado ejecutándolo: `['Tharan', 'Archet', 'Bree']`. Las vistas dicen otra cosa: P0 «Tharan, Bree y Archet» (mjs L321) y el menú de §5 (espec. L191-201; mjs L241). `DOMINIOS` del ejemplo guarda el orden Tharan, Bree, Archet (`src/dominio/ejemplo/partidaYPersonaje.ts` L62-67). Resuelve la crítica C21 y la duda D6a-26.
- **D-081**: espec. L203 («Al abrir, la app muestra la última partida usada»), la anotación de P0 (mjs L1908), la hoja de ruta (Fase 9, `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md` L124-131: P7 y altas) y la decisión del usuario del 2026-09-18 (6b: Inicio, P3, P4 y P5). Resuelve D6a-15 y `pantallas-y-datos.md` §9.1 y §9.11.
- **D-082**: se usa `documentoDeEjemplo()` (`src/dominio/ejemplo/sombraDelEste.ts` L55), con el id fijo `p.sombra-del-este` (`src/dominio/ejemplo/ids.ts` L4). Resuelve D6a-16, con la opción (b) ampliada para que el ejemplo siga al alcance aunque ya haya otras partidas.
- **D-083**: espec. L264 y L820; anotación de mjs L1908. Resuelve D6a-23 y `pantallas-y-datos.md` §9.2.
- **D-084**: espec. L265, L824 y L909 (n.º 31); los textos, de espec. L866. Resuelve D6a-25.
- **D-085**: vista P1 (mjs L344-349); `pantallas-y-datos.md` §9.7 y §9.13. Resuelve D6a-19.
- **D-086**: espec. L278 y L661. Resuelve C17 y D6a-18.
- **D-087**: vista P1b (mjs L1556-1563); `EsquemaImporteMagnitud` admite 0 (`src/dominio/modelo/comunes.ts` L90-92). Resuelve D6a-20 y `pantallas-y-datos.md` §9.9.
- **D-088**: J2e en espec. L1452; D-014; `EsquemaNombreLibre` (comunes.ts L150) y `EsquemaNotas` (L162); vista P1b (mjs L1555). Resuelve D6a-21 y `pantallas-y-datos.md` §9.4.
- **D-089**: espec. L266 y L660; `EsquemaPartida` (`src/dominio/modelo/partida.ts` L32-36); `validarCoherenciaInterna` exige que el alta de un asentamiento quede entre la fecha inicial y la actual (`src/dominio/validacion/coherencia.ts` L89-98). Resuelve D6a-24 y `pantallas-y-datos.md` §9.5 y §9.6.
- **D-090**: vista J2d `PersonajeEliminarMovimiento` (mjs L1798-1813; espec. L1434), espec. L221, L697 y L801. Resuelve C1, D-C6 y parte de D6a-23.
- **D-091**: espec. L269-270 y L691; `nombreDeCopia` (`src/dominio/copia/comoCopia.ts` L34). Resuelve `pantallas-y-datos.md` §9.8 y parte de D6a-23.
- **D-092**: espec. L273; `ResumenImportacion.lineas` (`src/datos/copia/importar.ts` L107-134); `analizar.ts` L19. Resuelve H6, C24 y D6a-17.
- **D-093**: mjs L250-251 (barra), L348 (P1), L628 (P6), L301 y L632 (fechas reales). `formatearFecha` da «jueves, 12 de abril…» (`src/dominio/calendario/formatoFecha.ts` L44-58). Resuelve C18, H7 y D6a-22.
- **D-094**: espec. L814-816; la única pieza desactivada del generador, la casilla (mjs L1372). Resuelve la duda 5 de `sistema-visual.md` y la segunda parte de D6a-11.
- **D-095**: espec. L830-846 y L891 (n.º 13; grupos «Habituales · Personalizadas»); A7b dibuja la próxima fecha como «sábado 14 de abril» (mjs L1738). Resuelve D-C8 y D-C9.
- **D-096**: D-001; espec. L156 y L829; pendiente «Ocho casos límite» (`docs/decisiones.md` L88).
- **D-097**: espec. L829 y L881; semana de lunes a domingo (§4, `diaDeLaSemana`).
- **D-098**: espec. §2 (L77) y §10 (L1403); emblema, mjs L76-77. Resuelve D6a-02, D6a-03, D6a-04 y D6a-05.
- **D-099**: crítica §1.1 y §5.1; `CLAUDE.md` («publicar el proyecto fuera de su repositorio» se pregunta). Resuelve D6a-01 para la 6a. **Queda como pregunta para el usuario** antes de jugar de verdad.

---

## (b) Técnicas

No cambian nada de lo que ve el jugador ni de las reglas. En `docs/decisiones.md` van en una sola línea, como D-016 y D-042 («Todo lo demás de la fase 6a es técnico…»), dentro del mismo bloque. No se numeran aparte.

- **Rama**: `implementacion/fase-6a`, desde `diseno/especificacion-y-vistas` (3a77322, 568 pruebas en 48 archivos), nunca desde `implementacion/fase-3`. Se fusiona después de las fases 3 a 5.
- **Dependencias, comprobadas con `npm view` el 2026-09-18 e instaladas en una copia de prueba.**
  - `dependencies`: `@fontsource/cinzel`, `@fontsource/cormorant-garamond` y `@fontsource/source-sans-3`, las tres `^5.3.0`.
  - `devDependencies`: `vite-plugin-pwa` `^1.3.0`, `@testing-library/react` `^16.3.3`, `@testing-library/dom` `^10.4.2`, `@testing-library/user-event` `^14.6.7`, `@testing-library/jest-dom` `^7.0.1` y `happy-dom` `^20.14.5`.
  - `@testing-library/dom` es dependencia *peer* de `@testing-library/react` 16 y faltaba en `tecnica.md`.
- **Vitest**: dos proyectos en `vite.config.ts`.
  - `nodo`: `src/**/*.test.ts` menos `src/interfaz/**`, en node, como hasta ahora.
  - `interfaz`: `src/interfaz/**/*.test.{ts,tsx}`, en happy-dom, con `preparar.ts`.
  - Sin `globals` y sin *shim* de `<dialog>`: happy-dom 20 ya trae `showModal` y `close`.
- **Estilos**: CSS Modules con variables CSS sin prefijo (`--papel`, `--oro-oscuro`…). Sin biblioteca de estilos, de rutas, de estado ni de formularios.
- **Fuentes**: seis CSS de Fontsource, solo del subconjunto `latin`, que cubre tildes, ñ, «», “”, … y el signo − (U+2212).
  - Cormorant Garamond: 600 y 500 cursiva.
  - Source Sans 3: 400, 600 y 700.
  - Cinzel: 600.
- **PWA**: `generateSW`, con `registerType: 'autoUpdate'` e `injectRegister: 'auto'` (sin `virtual:pwa-register` ni tipos nuevos).
  - `workbox.globPatterns` es `['**/*.{js,css,html,woff2}']`; el manifiesto y sus iconos los añade el propio plugin.
  - Con eso, el precaché queda en 14 entradas, sin repetidas ni `.woff`.
  - Los iconos PNG salen de `scripts/iconos.mjs`, sin dependencias, y `scripts/comprobarPwa.mjs` comprueba `dist/` después del *build*.
- **`index.html`**: `interactive-widget=resizes-content` en la meta `viewport` (para el teclado de la fase 9), `theme-color` `#FBF6E9` y favicon.
- **Servicios inyectados**: `db`, `ahora`, `nuevoId` y `descargar` llegan por un contexto. En las pruebas se usan `baseDePrueba()`, un reloj fijo e ids en serie.
- **Código**:
  - Las funciones de respuesta se llaman `al…` (`alPulsar`, `alCambiar`).
  - Un `.tsx` solo exporta componentes, tipos y constantes. Contextos, *hooks* y funciones van en `.ts`, porque oxlint avisa con `react/only-export-components`; se ha comprobado.
  - Las pruebas leen `data-variante`, `data-tono`, `data-apilado` y `data-principal`, no las clases.
- **Accesibilidad**:
  - Foco con `:focus-visible` en `outline: 2px solid var(--oro-oscuro)`, porque `oro` sobre papel da 2,94:1.
  - Desactivado: `disabled` nativo con `opacity: 0.6`.
  - Sin *hover* propio, salvo los enlaces, bajo `@media (hover: hover)`.
  - `.oxlintrc.json` no se toca.
- **Diálogo**: `<dialog>` nativo con `showModal`.
  - Un contexto de nivel apila el segundo diálogo, anclado a 24 px, con el velo al 35 %. Un tercero lanza un error.
  - `::backdrop` usa el `rgba` literal, porque en Chrome anteriores al 122 no hereda las variables.
  - Antes de `showModal` se mira `dialog.open`, para StrictMode.
- **Selector**:
  - Cerrado: 1 px `borde`. Abierto: 2 px `oro`. Así se corrige C2.
  - Todas las opciones de segmentos van en peso 600 (C4).
  - El degradado del pie se hace con CSS (`background-attachment: local`).
  - La búsqueda y el resaltado usan `buscarEn`, que conserva los índices del texto original.
- **Dominio y datos nuevos, en archivos nuevos**: `calendario/textosFecha.ts`, `texto/buscar.ts`, `dinero/textosEquivalencias.ts`, `partidas/orden.ts`, `partidas/textos.ts`, `partidas/nueva.ts`, `partidas/datos.ts`, `calendario/formularioFrecuencia.ts`, `datos/resumenes.ts` y `datos/datosDePartida.ts`.
  - El único archivo existente del dominio que se toca es `modelo/resumen.ts`, con su prueba (D-080). La fase 3 no lo toca.
  - No se toca `formatoFecha.ts`, `importe.ts` ni nada de `motor/`, `avisos/`, `avance/` o `edicion/`.
- **Cambios de la partida**: `guardarDatosDePartida` suma 1 al contador si algo cambió. Al fusionar, la 6b lo reescribe sobre `guardarEdicion` de la fase 3 (`src/datos/ediciones.ts`).
- **Navegador**:
  - `navigator.storage?.persist?.()` va protegido: happy-dom no trae `navigator.storage`; se ha comprobado.
  - El selector de archivo usa `accept=".json,application/json"`.
  - La descarga usa Blob, `URL.createObjectURL` y `<a download>`, en un módulo que las pruebas sustituyen.
- **Vite `base`**: se queda en `/`. Si la app se publica en una subruta, como GitHub Pages, cambian `base`, `scope` y `start_url` (D-099).
