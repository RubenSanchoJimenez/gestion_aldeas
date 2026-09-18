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

- **Planes**: usa la skill `superpowers:writing-plans`. Un plan detallado por fase, con tareas pequeñas, código completo en cada paso y comandos con su salida esperada.
- **Verifica el plan antes de ejecutarlo**: ejecútalo entero en un clon del repositorio dentro del scratchpad y corrige lo que falle. Nunca en el repositorio de verdad.
- **Ejecución**: usa la skill `superpowers:subagent-driven-development`, un agente por tarea y dos revisiones (especificación y calidad) con sus bucles de arreglo. Los problemas del plan o de la especificación no los arregla un corrector: los decides tú y los anotas.
- **Rama por fase**: `implementacion/fase-N`, creada desde la rama de trabajo actual. Al cerrar la fase, fusiónala en local, borra la rama y sube la rama de trabajo a GitHub.
- **Cierre de fase**: `npm test`, `npx tsc -b`, `npm run build` y `npm run lint` en verde, árbol de trabajo limpio y una revisión final de toda la fase.

## Qué modelo usa cada agente

Para gastar menos sin perder calidad (pedido por el usuario el 2026-09-18):

- **Haiku 4.5** para lo puramente mecánico: implementar una tarea de un plan **ya verificado**, que consiste en copiar sus bloques de código y ejecutar sus comandos, y los arreglos del plan que solo cambian números o salidas esperadas. Si Haiku termina bloqueado, con dudas o con la revisión de especificación fallada dos veces, la tarea se repite con Sonnet.
- **Sonnet 5** para el trabajo que sigue instrucciones ya fijadas pero exige criterio: leer y extraer datos de la especificación, escribir las tareas del plan a partir del contrato, montar el plan, verificarlo ejecutándolo, corregir lo que señalan las revisiones, y las revisiones de especificación y de calidad de cada tarea.
- **Sin modelo** (un script): las comprobaciones que no necesitan juicio, como comparar un bloque del plan con un archivo, contar pruebas o revisar que las vallas de código estén pareadas.
- **Opus 5** solo donde hay que pensar o decidir: el crítico que cruza los informes, el contrato de cada fase (decisiones, tipos y lista de tareas), la revisión final de cada fase y cualquier tarea que Sonnet haya dejado bloqueada o mal dos veces.

## Reglas del código

- TypeScript estricto. Dominio puro en `src/dominio` (sin React, sin Dexie, sin APIs del navegador; Zod sí). IndexedDB y lo que toque el navegador, en `src/datos`. Interfaz en `src/interfaz`.
- Identificadores en castellano **sin tildes ni eñes** (`anio`, `dia`, `interesPct`, `daniado`); los textos visibles sí llevan tildes.
- El dinero se guarda en enteros de hierro (mh), nunca en coma flotante. Presentación: coma decimal, punto de miles desde 1.000 y signo «−» (U+2212).
- Pruebas al lado del archivo (`*.test.ts`) con Vitest, y TDD: primero la prueba que falla.
- Commits en castellano, con el prefijo del tipo (`feat(dinero): …`), y terminados con la línea `Co-Authored-By` del modelo que hace el trabajo.

## Idioma

Todo en castellano: conversación, documentación, mensajes de commit y textos de la app. El usuario juega a MERP y decide sobre el juego; tú decides sobre la técnica.
