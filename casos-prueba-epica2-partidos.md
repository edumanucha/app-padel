# Matriz de Casos de Prueba Manuales — Épica 2: Gestión de Partidos

Basado en las historias de usuario de `historias-usuario-mvp.md` (Épica 2). Cubre casos funcionales, negativos, de límite y de seguridad — incluye varios casos de condición de carrera (cupos, invitaciones) por la naturaleza concurrente de "sumarse a un partido".

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-2.1 — Crear partido

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.1.1 | Crear partido con todos los datos válidos | Sesión iniciada, perfil completo | 1. Ir a "Crear partido". 2. Completar fecha, hora, cancha y cantidad de jugadores. 3. Confirmar. | El partido se crea en estado "abierto"; quedo anotado y confirmado como organizador. | Funcional | Alta |
| CP-2.1.2 | Intentar crear un partido con fecha/hora en el pasado | Ídem | 1. Completar el formulario con una fecha ya pasada. 2. Confirmar. | Mensaje de validación; el partido no se crea. | Negativo | Alta |
| CP-2.1.3 | Intentar crear partido dejando un campo obligatorio vacío | Ídem | 1. Dejar "cancha" (o cualquier campo obligatorio) vacío. 2. Confirmar. | Mensaje de validación; el partido no se crea. | Negativo | Alta |
| CP-2.1.4 | Verificar que el organizador queda confirmado automáticamente | Acabo de crear un partido | 1. Ver el detalle del partido recién creado. | Aparezco en la lista de jugadores como confirmado, ocupando uno de los cupos. | Funcional | Media |
| CP-2.1.5 | Intentar crear un partido con fecha pasada manipulando el request directamente | Sesión iniciada (Postman/API, sin pasar por la UI) | 1. Armar un `INSERT` directo a la API con `fecha_hora` en el pasado. | El backend rechaza la operación (la validación de "fecha a futuro" no depende solo del formulario). | Seguridad/Límite | Alta |
| CP-2.1.6 | Intentar crear un partido con una cantidad de jugadores fuera de rango (ej. 1000) | Sesión iniciada | 1. Completar "Jugadores necesarios" con un valor como 1000. 2. Enviar (por UI y, aparte, por request directo a la API). | El sistema no permite un valor fuera del rango 2–4 (definido por el usuario) ni por UI ni por API. | Negativo/Límite | Alta |

## US-2.2 — Ver partidos abiertos y sumarme

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.2.1 | Ver listado de partidos abiertos con cupos disponibles | Hay al menos un partido en estado "abierto" | 1. Ir a "Partidos abiertos". | Veo el listado con fecha, hora, cancha y cupos ocupados/totales de cada uno. | Funcional | Alta |
| CP-2.2.2 | Sumarme a un partido con cupo disponible | Un partido abierto tiene lugares libres | 1. Tocar "Sumarme" en un partido del listado. | Quedo agregado a la lista de jugadores de ese partido. | Funcional | Alta |
| CP-2.2.3 | Intentar sumarme a un partido ya completo (por UI) | Un partido está en estado "completo" | 1. Ver ese partido en el listado. | La opción "Sumarme" no está disponible; se muestra como "completo". | Negativo | Alta |
| CP-2.2.4 | Intentar sumarme a un partido completo manipulando el request directamente | Ídem, pero se arma el request a mano (Postman) sin pasar por la UI | 1. Enviar un request de "sumarse" directo al backend para un partido ya completo. | El backend rechaza la operación (no permite exceder el cupo aunque se salte la UI). | Seguridad/Límite | Alta |
| CP-2.2.5 | Intentar sumarme dos veces al mismo partido | Ya estoy anotado en un partido abierto | 1. Volver a tocar "Sumarme" en ese mismo partido (o repetir el request). | El sistema no me duplica en la lista de jugadores; no ocupo dos cupos. | Negativo | Media |

## US-2.3 — Invitar jugadores

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.3.1 | Invitar a un jugador con cupo disponible | Soy organizador de un partido abierto con lugares libres | 1. Ir a "Invitar jugador". 2. Buscar y seleccionar un jugador. 3. Invitar. | El jugador ve la invitación pendiente en su sección de invitaciones. | Funcional | Alta |
| CP-2.3.2 | Jugador invitado acepta la invitación | Tengo una invitación pendiente | 1. Ir a "Mis invitaciones". 2. Aceptar. | Quedo agregado al partido igual que si me hubiera sumado del listado. | Funcional | Alta |
| CP-2.3.3 | Jugador invitado rechaza la invitación | Ídem | 1. Ir a "Mis invitaciones". 2. Rechazar. | La invitación se descarta; el lugar sigue disponible para otros. | Funcional | Media |
| CP-2.3.4 | Aceptar una invitación cuando el partido ya se completó por otra vía | Tengo una invitación pendiente a un partido que mientras tanto se completó (otro jugador se sumó del listado) | 1. Ir a "Mis invitaciones". 2. Aceptar. | El sistema informa que ya no hay lugar disponible; no se me agrega excediendo el cupo. | Límite | Alta |

## US-2.4 — Confirmar (o cancelar) asistencia

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.4.1 | Confirmar asistencia estando anotado | Estoy anotado (sumado o invitación aceptada) en un partido | 1. Ir al detalle del partido. 2. Tocar "Confirmar asistencia". | Mi estado dentro del partido pasa a "confirmado". | Funcional | Alta |
| CP-2.4.2 | El partido pasa a "completo" cuando confirma el último jugador requerido | Faltaba un solo jugador por confirmar | 1. Ese último jugador confirma asistencia. | El estado del partido pasa de "abierto" a "completo". | Funcional | Alta |
| CP-2.4.3 | Cancelar mi asistencia y liberar el cupo | Estoy confirmado en un partido abierto | 1. Ir al detalle. 2. Tocar "Cancelar mi asistencia". | Dejo de estar anotado; el cupo vuelve a estar disponible para otros. | Funcional | Media |
| CP-2.4.4 | Un partido "completo" vuelve a "abierto" si alguien cancela su asistencia | El partido está en estado "completo" | 1. Un jugador confirmado cancela su asistencia. | El estado del partido vuelve a "abierto" (ya no está lleno). | Funcional | Media |

## US-2.5 — Estado del partido

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.5.1 | Ver el estado correcto de un partido en su detalle | Existe un partido en cualquier estado | 1. Entrar al detalle del partido. | Se muestra claramente el estado actual (abierto/completo/cancelado/jugado). | Funcional | Media |
| CP-2.5.2 | El organizador cancela el partido | Soy organizador de un partido abierto o completo | 1. Tocar "Cancelar partido". | El estado pasa a "cancelado"; los demás jugadores anotados lo ven reflejado. | Funcional | Alta |
| CP-2.5.3 | Un jugador no organizador intenta cancelar el partido (por UI) | No soy el organizador de ese partido | 1. Ir al detalle del partido. | No veo la opción "Cancelar partido" (solo la ve el organizador). | Negativo | Alta |
| CP-2.5.4 | Un jugador no organizador intenta cancelar el partido manipulando la API | Ídem, armando el request a mano | 1. Enviar el request de cancelación directo al backend, sin ser el organizador. | El backend rechaza la operación (autorización por dueño, no solo ocultar el botón). | Seguridad | Alta |
| CP-2.5.5 | Un partido completo con fecha/hora ya pasada cambia a "jugado" | Un partido estaba "completo" y su horario ya pasó | 1. Abrir el detalle del partido después de la hora programada. | El estado se actualiza a "jugado". | Límite | Media |

## US-2.6 — Privacidad del teléfono según confirmación

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.6.1 | Ver el teléfono de un jugador confirmado | Comparto partido con un jugador que confirmó asistencia | 1. Ver su perfil dentro del detalle del partido. | Veo su número de teléfono. | Funcional | Alta |
| CP-2.6.2 | No ver el teléfono de un jugador anotado pero no confirmado | Comparto partido con un jugador que no confirmó | 1. Ver su perfil dentro del detalle del partido. | No se muestra su teléfono. | Seguridad/Privacidad | Alta |
| CP-2.6.3 | Intentar obtener el teléfono de un jugador no confirmado manipulando la API | Ídem, request armado a mano | 1. Pedir el detalle del partido directo a la API, sin pasar por la UI. | La respuesta del backend no incluye el teléfono de jugadores no confirmados. | Seguridad | Alta |

## US-2.7 — Marcador en vivo (funcionalidades agregadas 2026-09-13)

**Nota de numeración:** la sección "Transversal" de abajo ya usa el prefijo `CP-2.7.x` desde antes de que existiera esta matriz formal para US-2.7 (quedó así por orden de redacción, no por diseño) — para no chocar con esos IDs ya en uso, los casos nuevos de esta sección usan el sufijo `CP-2.7N.x` ("N" de nuevo).

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.7N.1 | Corregir el marcador de juegos con "marcador, juegos X Y" | Estoy en el marcador en vivo de un partido en curso, escuchando por voz | 1. Decir "marcador, juegos 5 3" (o tocar el equivalente táctil). | El set en curso queda con el marcador de juegos en 5-3, sin afectar los sets ya jugados ni el saque. | Funcional | Alta |
| CP-2.7N.2 | Corregir a un resultado 6-6 dispara el tie-break | Ídem | 1. Decir "marcador, juegos 6 6". | El set queda 6-6 y el sistema entra directo al tie-break (conteo numérico simple), igual que si se hubiera llegado ahí jugando punto por punto. | Límite | Media |
| CP-2.7N.3 | Reconocer el número dicho como palabra, no solo como dígito | Ídem | 1. Decir "marcador, juegos cinco tres" (números en palabra, no en dígito). | Se interpreta igual que "juegos 5 3" — el reconocimiento de voz no siempre convierte los números a dígitos. | Funcional | Media |
| CP-2.7N.4 | El modo apaisado no depende de la orientación física del teléfono | Tengo el auto-rotate del sistema operativo desactivado (a propósito, para este caso) | 1. Tocar el botón "Modo apaisado" sin girar el teléfono. 2. Girar el teléfono después. | El tablero se ve forzado a apaisado apenas se toca el botón (independientemente del auto-rotate del SO); al girar el teléfono de verdad, queda legible. El botón pasa a decir "Modo vertical". | Funcional | Alta |
| CP-2.7N.5 | Volver a modo vertical con el mismo botón | Modo apaisado activado | 1. Tocar "Modo vertical". | El tablero vuelve al layout vertical normal. | Funcional | Baja |
| CP-2.7N.6 | Cambiar entre "Tema verde" y "Tema neón" | Estoy en el marcador en vivo | 1. Tocar el botón de tema (muestra "Tema neón" si estoy en el clásico, o "Tema verde" si estoy en neón). | El tablero cambia de paleta (verde clásico ↔ fondo negro con acentos neón); ninguna regla de juego ni el puntaje se ven afectados. | Funcional | Baja |
| CP-2.7N.7 | La elección de tema se recuerda entre partidos | Elegí "Tema neón" en un partido anterior | 1. Cerrar y volver a entrar al marcador de otro partido (mismo navegador/dispositivo). | El tema sigue siendo "Tema neón" (persistido en `localStorage`, no depende del partido). | Límite | Baja |
| CP-2.7N.8 | El tema elegido es por dispositivo, no se sincroniza entre los jugadores del partido | Dos jugadores del mismo partido, cada uno en su propio teléfono | 1. Un jugador cambia a "Tema neón" en el suyo. | El otro jugador sigue viendo el tema que tenía elegido en su propio dispositivo (localStorage es local a cada uno) — solo el tanteo en sí se sincroniza en tiempo real, no la preferencia de tema. | Funcional | Baja |

## Transversal (aplica a toda la épica)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-2.7.1 | Pantallas de partidos (listado, detalle, crear) se ven y funcionan bien en mobile y desktop | — | 1. Repetir crear partido, ver listado y ver detalle desde un navegador de escritorio y desde un viewport móvil. | Todas las pantallas son usables y legibles en ambos casos. | Responsive | Media |

## Candidatos a automatización temprana (referencia para el chat "Automatización")

- CP-2.2.4 y CP-2.5.4 son los mejores primeros candidatos de Postman después de CP-1.2.5: ambos validan reglas de negocio y de autorización a nivel API que no se pueden verificar solo mirando la UI (cupo excedido, cancelación sin ser dueño).
- CP-2.1.1, CP-2.2.2 y CP-2.4.1 son el flujo E2E crítico de esta épica (crear → sumarse → confirmar) — buen segundo test de Playwright después del login, una vez que exista la UI real.

## Resultado de la ejecución manual (2026-09-05, "Diseño QA")

Ejecutados manualmente US-2.1, US-2.2 y US-2.3 contra la app en local, combinando UI (navegador) y requests directos a la API (Postman + scripts del asistente), a medida que se construía cada historia.

**US-2.1 — Crear partido:**
- CP-2.1.1 ✅ Pasa.
- CP-2.1.2 ✅ Pasa por UI. **Encontrado BUG-005** al probarlo también por API directa (CP-2.1.5, agregado a esta matriz): la validación de fecha a futuro solo existía en el frontend. Corregido con un trigger `BEFORE INSERT` en la base — reverificado, ahora rechaza en ambos casos.
- CP-2.1.3 ⚪ No ejecutado en esta ronda (queda pendiente: dejar un campo obligatorio vacío y confirmar que el botón sigue deshabilitado, mismo patrón ya verificado extensamente en la Épica 1).
- CP-2.1.4 ✅ Pasa (verificado también por API: el trigger crea la fila del organizador como "confirmado").
- CP-2.1.5 (nuevo) ✅ Pasa tras el fix de BUG-005.
- CP-2.1.6 (nuevo) ✅ Pasa tras el fix de BUG-004 — antes de corregirlo, aceptaba `cantidad_jugadores = 1000` sin ningún error (tope definido por el usuario: 2 a 4).

**US-2.2 — Ver partidos abiertos y sumarme:**
- CP-2.2.1 ✅ Pasa.
- CP-2.2.2 ✅ Pasa.
- CP-2.2.3 ✅ Pasa — verificado que un jugador ajeno al partido ve la etiqueta "Completo" (no el botón "Sumarme") cuando el cupo está lleno.
- CP-2.2.4 ✅ Pasa — un tercer intento de "sumarme" a un partido con cupo lleno es rechazado por la base (**BUG-006** se encontró en el camino al probar esto: la política RLS de `partido_jugadores` tenía recursión infinita y bloqueaba cualquier lectura de la tabla, no solo este caso — corregido).
- CP-2.2.5 ✅ Pasa — intentar sumarme dos veces al mismo partido (con cupo de sobra, para aislarlo del rechazo por cupo) es rechazado por la restricción `UNIQUE(partido_id, jugador_id)` de la base.

**US-2.3 — Invitar jugadores:**
- CP-2.3.1 ✅ Pasa.
- CP-2.3.2 ✅ Pasa.
- CP-2.3.3 ✅ Pasa.
- CP-2.3.4 ✅ Pasa — probado con 4 usuarios de prueba distintos (organizador, invitado, y un segundo jugador que llena el cupo mientras la invitación espera); la aceptación tardía es rechazada con un mensaje claro.

**Bugs encontrados en esta ronda:** BUG-004, BUG-005, BUG-006 (ver `registro-errores.md`) — los 3 corregidos y reverificados el mismo día.

## Resultado de la ejecución manual (2026-09-05, cierre de Épica 2)

Con US-2.4 a US-2.9 ya construidas, se hizo una pasada de humo (smoke) enfocada en los flujos nuevos y de mayor riesgo, priorizando avanzar rápido hacia la Épica 3 por decisión del usuario. **No se ejecutó la matriz completa CP-2.4.x a CP-2.6.x fila por fila** — queda pendiente para la pasada de Postman al final de todo el desarrollo (decisión del usuario, 2026-09-05: Postman se hace al final del proyecto, no al cierre de cada épica).

**Verificado en esta ronda:**
- CP-2.1.1 ✅ Reverificado (creación de partido con cantidad variable, quedo confirmado como organizador).
- CP-2.2.2 ✅ Reverificado (sumarme a un partido con cupo).
- **CP-2.7.x (Marcador táctil/ad-hoc)** ✅ Flujo completo probado: crear partido ad-hoc (US-2.8) con 3 invitados libres sin cuenta, cargar puntos por botón táctil (+1 A), terminar el partido manualmente con confirmación de dos pasos, ver el resultado final anunciado en pantalla.
- **CP-2.9 (Apelar)** ✅ Se apeló el partido recién jugado desde el botón "🚩 Apelar" (motivo de texto libre); la apelación quedó en estado "pendiente" y visible en `/apelaciones` solo para el apelante (confirma la regla de "mis apelaciones" vs. bandeja de superusuario).
- Reconocimiento de voz y sincronización en tiempo real: **no re-ejecutados en esta ronda** (no hay micrófono disponible en el navegador de prueba del asistente); quedan como confirmados por las pruebas manuales hechas por el usuario durante la construcción de US-2.7 (bug de reconocimiento continuo encontrado y corregido en esa instancia, ver notas de sesión).
- Resolución de una apelación como superusuario (US-2.9): **no ejecutada** — requiere loguearse con la cuenta superusuario real del usuario; queda como pendiente explícito para cuando el usuario la pruebe.

**Bug encontrado y corregido en esta ronda:** BUG-007 (ver `registro-errores.md`) — "Partidos abiertos" mezclaba partidos ya jugados en el listado.

**Pendiente para la pasada de Postman de fin de proyecto:** CP-2.3.x (re-verificación), y agregar aquí las filas de casos formales para US-2.7/2.8/2.9 (hoy solo hay ejecución de humo, no una matriz CP-2.7.x/2.8.x/2.9.x detallada como el resto de la épica).

## Resultado de la ejecución manual (2026-09-06, US-2.4/2.5/2.6 — pendientes de la ronda anterior)

Ejecutado contra la API directamente (dos cuentas reales: organizador + participante), con verificación de estado en la base después de cada paso.

**US-2.4 — Confirmar (o cancelar) asistencia:**
- CP-2.4.1 ✅ Pasa — participante anotado confirma asistencia (`estado: anotado → confirmado`).
- CP-2.4.2 ✅ Pasa — al confirmar el último jugador requerido (organizador ya confirmado automáticamente + participante confirma), el partido pasa de `abierto` a `completo` automáticamente.
- CP-2.4.3 ✅ Pasa — el participante cancela su asistencia (`DELETE`), `lugares_ocupados` baja y el cupo queda libre.
- CP-2.4.4 ✅ Pasa — al cancelar el jugador confirmado, el partido vuelve de `completo` a `abierto`.
- Regla de 1 hora (decisión de US-2.4) ✅ Pasa — con un partido a 20 minutos, el intento de cancelar la asistencia de un jugador confirmado es rechazado (`400`, `P0001: Ya no podés salir del partido: falta menos de 1 hora para el partido`), y la fila sigue existiendo.

**US-2.5 — Ver y gestionar el estado del partido:**
- CP-2.5.2 ✅ Pasa — el organizador cancela su propio partido (`PATCH estado=cancelado`), `200`.
- CP-2.5.3/CP-2.5.4 ✅ Pasa — un jugador que no es organizador intenta cancelar el partido vía API directa (`PATCH estado=cancelado`); la respuesta es `200` pero con `[]` (la política RLS excluye la fila, cero filas afectadas) y el estado real del partido no cambia — autorización real a nivel de base, no solo ocultamiento de botón en la UI.
- CP-2.5.5 ✅ Pasa — partido `completo` con fecha ya pasada: al llamar al RPC `marcar_partidos_jugados()`, el estado pasa a `jugado`.

**US-2.6 — Privacidad del teléfono según confirmación:**
- CP-2.6.1 ✅ Pasa (tras el fix de BUG-008) — jugador confirmado: su teléfono aparece en `ver_participantes_partido`.
- CP-2.6.2 ✅ Pasa (tras el fix de BUG-008) — jugador anotado sin confirmar: su teléfono aparece como `null`.
- CP-2.6.3 ✅ Pasa — un jugador intenta leer el teléfono de otro directamente de la tabla `perfiles` (sin pasar por el RPC): la respuesta es `200` con `[]` (RLS de "ver mi propio perfil" de la Épica 1 lo bloquea igual).

**Bug encontrado y corregido en esta ronda:** **BUG-008** (ver `registro-errores.md`) — `ver_participantes_partido` fallaba con un error de tipos (`nivel integer` declarado vs. `smallint` real) en **toda** llamada, sin excepción — la sección "Plantel" del detalle de cualquier partido estaba silenciosamente vacía desde que se construyó US-2.6. Es el hallazgo más importante de esta ronda: un bug de severidad Alta que pasó desapercibido porque el frontend no mostraba ningún error visible al usuario, solo una lista vacía.

Con esto, **toda la Épica 2 (US-2.1 a US-2.6) queda con ejecución formal completa**; US-2.7/2.8/2.9 siguen con ejecución de humo (ver ronda anterior), pendientes de matriz CP formal y de Postman al cierre general del proyecto.
