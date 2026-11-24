# Gestión de Aldeas · cómo trabajamos

App de tablet Android (PWA con React, TypeScript y Vite) que lleva la economía de una partida individual de rol de mesa de *El Señor de los Anillos* con reglas MERP: el personaje, sus asentamientos, el calendario con «Avanzar días» y el estudio de hechizos.

- **Especificación** (manda sobre todo lo demás): `docs/superpowers/specs/2026-09-15-gestion-aldeas-design.md`.
- **Hoja de ruta y fase 1**: `docs/superpowers/plans/2026-09-17-gestion-aldeas-plan.md`. Planes de cada fase: `docs/superpowers/plans/`.
- **Vistas**: `design/artboards/*.dc.html`, generadas por `design/build-artboards.mjs`.
- **Decisiones tomadas sin preguntar**: `docs/decisiones.md`.

## Autorización permanente del usuario (2026-09-18)

Puedes desarrollar el proyecto entero, fase por fase y en el orden de la hoja de ruta, **sin parar a preguntar**:

1. Escribe el plan de la fase, ejecútalo y ciérralo; después empieza la siguiente.
2. Cuando surja una duda que la especificación no resuelva, **decídela tú** con el criterio de abajo y sigue.
3. Anota **cada** decisión en `docs/decisiones.md` para que el usuario pueda cambiarla luego.
4. No pidas permiso para continuar ni resumas el estado esperando respuesta: informa de lo hecho y sigue.

### Cómo decidir

En este orden: lo que ya diga la especificación o las vistas → lo que ya se haya decidido antes (`docs/decisiones.md`) → lo más simple que cumpla las reglas del juego → lo más fácil de cambiar después. Ante la duda, no inventes reglas de juego nuevas: elige la opción que menos añada.

**Subir a GitHub está autorizado** (2026-09-18): haz `git push` cuando quieras, también de ramas nuevas, sin avisar. Nunca con `--force` ni reescribiendo historial ya subido. Abrir un *pull request* o publicar el proyecto en otro sitio sí se pregunta antes.

Sigue preguntando solo en estos casos:
- abrir un PR o publicar el proyecto fuera de su repositorio;
- borrar o reescribir trabajo del usuario (ramas, historial, la especificación, el canvas de diseño);
- cambiar una decisión marcada «decidido por el usuario» en la especificación o en `docs/decisiones.md`;
- gastar dinero o contratar servicios.

### Registro de decisiones

Cada entrada de `docs/decisiones.md` lleva: identificador (`D-NNN`), fecha, fase, título, el problema en una o dos frases, las opciones que había, la elegida, por qué, qué archivos o vistas toca y qué costaría cambiarla más adelante. Ordena de la más reciente a la más antigua. Si el usuario cambia una decisión, marca la entrada como sustituida en vez de borrarla.

## Cómo se construye

Método ahorrador, elegido por el usuario el 2026-09-19 porque se llegaba al límite de uso demasiado rápido:

- **Investigación ligera**: pocos lectores, informes de 300 líneas como mucho, y el crítico va dentro del agente que escribe el contrato (Opus), no aparte.
- **Planes**: usa la skill `superpowers:writing-plans`. Un plan por fase con **unas 15 tareas grandes**, no 30 pequeñas. Código completo en cada paso, pero **sin ruido**: nada de salidas de `git commit`, avisos de fin de línea ni recuentos de líneas insertadas; las citas de la especificación, en una línea.
- **Verifica el plan una sola vez**: cada escritor prueba su código en una réplica del scratchpad antes de escribirlo. No se vuelve a ejecutar el plan entero en otro clon; la ejecución real hace de verificación final. Nunca en el repositorio de verdad.
- **Ejecución**: skill `superpowers:subagent-driven-development` con un agente por tarea, pero **sin revisor de especificación por tarea**: lo sustituye un script que compara los archivos del plan con los commiteados y pasa `tsc` y las pruebas. La **revisión de calidad va por bloques** de 4 o 5 tareas, con su bucle de arreglo, más la revisión final de la fase con Opus. Los problemas del plan o de la especificación no los arregla un corrector: los decides tú y los anotas.
- **Un solo flujo pesado a la vez**, en lotes pequeños, para que un corte por el límite no tire trabajo.
- **Rama por fase**: `implementacion/fase-N`, creada desde la rama de trabajo actual. Al cerrar la fase, fusiónala en local, borra la rama y sube la rama de trabajo a GitHub.
- **Cierre de fase**: `npm test`, `npx tsc -b`, `npm run build` y `npm run lint` en verde, árbol de trabajo limpio y una revisión final de toda la fase.

## Trabajo en sesión, sin subagentes (2026-11-24)

El usuario pidió que Claude haga el trabajo **él mismo, en la conversación**, sin repartirlo entre subagentes ni flujos de agentes. Manda sobre el apartado anterior y sobre el de los modelos: nada de delegar tareas, revisiones, planes ni investigaciones. Lo que sí se sigue usando:

- los **scripts** de `scripts/` (por ejemplo `comprobar-tarea.mjs`), que no gastan modelo;
- los planes por fase ya escritos, que se ejecutan tarea a tarea en la conversación, con TDD y un commit por tarea;
- las revisiones, que las hace Claude leyendo el código, al cerrar cada bloque de tareas y la fase.

## Qué modelo usa cada agente

(Se mantiene solo como referencia por si el usuario vuelve a pedir subagentes; hoy no se usan.)

Para gastar menos sin perder calidad (pedido por el usuario el 2026-09-18):

- **Haiku 4.5** para lo puramente mecánico: implementar una tarea de un plan **ya verificado**, que consiste en copiar sus bloques de código y ejecutar sus comandos, y los arreglos del plan que solo cambian números o salidas esperadas. Si Haiku termina bloqueado, con dudas o sin pasar el script de comprobación, la tarea pasa a Sonnet.
- **Sonnet 5** para el trabajo que sigue instrucciones ya fijadas pero exige criterio: leer y extraer datos de la especificación, escribir las tareas del plan a partir del contrato, montar el plan, corregir lo que señalan las revisiones, y la revisión de calidad de cada bloque de tareas.
- **Sin modelo** (un script): las comprobaciones que no necesitan juicio, como comparar un bloque del plan con un archivo, contar pruebas o revisar que las vallas de código estén pareadas.
- **Opus 5** solo donde hay que pensar o decidir: el contrato de cada fase (con el cruce de informes dentro), la revisión final de cada fase y cualquier tarea que Sonnet haya dejado bloqueada o mal dos veces.

## Reglas del código

- TypeScript estricto. Dominio puro en `src/dominio` (sin React, sin Dexie, sin APIs del navegador; Zod sí). IndexedDB y lo que toque el navegador, en `src/datos`. Interfaz en `src/interfaz`.
- Identificadores en castellano **sin tildes ni eñes** (`anio`, `dia`, `interesPct`, `daniado`); los textos visibles sí llevan tildes.
- El dinero se guarda en enteros de hierro (mh), nunca en coma flotante. Presentación: coma decimal, punto de miles desde 1.000 y signo «−» (U+2212).
- Pruebas al lado del archivo (`*.test.ts`) con Vitest, y TDD: primero la prueba que falla.
- Commits en castellano, con el prefijo del tipo (`feat(dinero): …`), y terminados con la línea `Co-Authored-By` del modelo que hace el trabajo.

## Idioma

Todo en castellano: conversación, documentación, mensajes de commit y textos de la app. El usuario juega a MERP y decide sobre el juego; tú decides sobre la técnica.
