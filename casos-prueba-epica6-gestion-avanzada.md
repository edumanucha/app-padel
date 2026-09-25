# Matriz de Casos de Prueba Manuales — Épica 6: Gestión Avanzada de Partidos

Basado en las historias de usuario de `historias-usuario-mvp.md` (sección "Post-MVP: Épicas de mejoras"). Ejecutada de punta a punta (API directa + navegador) el 2026-09-06/07, con 6 bugs reales encontrados y corregidos en el proceso (BUG-019 a BUG-022, BUG-025, BUG-026) — ver detalle completo en `registro-errores.md`.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-6.1 — Ver mi historial de partidos (Mis partidos)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-6.1.1 | Ver todos mis partidos en cualquier estado | Cuenta con partidos en varios estados | 1. Entrar a "Mis partidos". | Veo abiertos/completos/cancelados/jugados, ordenados por fecha descendente. | Funcional | Alta |
| CP-6.1.2 | Ver resultado de un partido jugado sin entrar al detalle | Partido jugado con resultado guardado | 1. Ver el listado. | Se ve rival y marcador directo en la fila. | Funcional | Media |
| CP-6.1.3 | Placeholder sin actividad | Cuenta sin partidos | 1. Entrar a "Mis partidos". | Mensaje placeholder claro, sin error. | Límite | Media |

## US-6.2 — Filtrar partidos abiertos

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-6.2.1 | Filtrar por texto de cancha/zona | Varios partidos abiertos | 1. Escribir un texto en el filtro. | Solo quedan los que matchean (case-insensitive) en `cancha`. | Funcional | Media |
| CP-6.2.2 | Filtrar por fecha exacta | Ídem | 1. Elegir una fecha en el filtro. | Solo quedan los partidos de esa fecha. | Funcional | Media |
| CP-6.2.3 | Filtrar por nivel | Partidos con `nivel_min`/`nivel_max` | 1. Elegir un nivel en el filtro. | Solo quedan los partidos cuyo rango incluye ese nivel. | Funcional | Media |
| CP-6.2.4 | Sin resultados para el filtro | Filtro que no matchea nada | 1. Aplicar un filtro imposible. | Mensaje "Ningún partido coincide con ese filtro", no una lista vacía muda. | Límite | Baja |

## US-6.3 — Nivel mínimo/máximo al crear un partido

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-6.3.1 | Declarar rango de nivel opcional al crear | — | 1. Crear partido con nivel mín/máx. | Se guarda en `partidos.nivel_min`/`nivel_max`. | Funcional | Media |
| CP-6.3.2 | Advertencia informativa, no bloqueante | Partido con rango 6ª-7ª, jugador de nivel 3 | 1. Ese jugador intenta sumarse (API directa, sin pasar por la UI). | El insert se acepta igual (no hay restricción de servidor por nivel). | Seguridad/Negativo | Alta |
| CP-6.3.3 | Ver la advertencia visual en la UI | Ídem, en el listado | 1. Ver "Partidos abiertos" logueado como ese jugador. | Aparece "⚠️ Tu nivel declarado queda fuera del rango sugerido — podés sumarte igual". | Funcional | Baja |

## US-6.4 — Lista de espera para partidos completos

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-6.4.1 | Anotarse en lista de espera de un partido completo | Partido con cupo lleno (`lugares_ocupados >= cantidad_jugadores`) | 1. Insertar `partido_jugadores` con `estado: 'en_espera'`. | Se acepta (antes de la corrección, BUG-022, daba 403 RLS siempre). | Funcional | Alta |
| CP-6.4.2 | Se avisa solo al primero de la lista al liberarse un lugar | 2+ personas en lista de espera, ordenadas por `created_at` | 1. Alguien con lugar ocupado sale del partido. | Solo el más antiguo de la lista recibe la notificación `lugar_disponible` y queda `avisado_lista_espera=true`; el resto sigue sin avisar (antes de la corrección, BUG-025, se avisaba a todos en cascada). | Funcional | Alta |
| CP-6.4.3 | Confirmar mi lugar tras el aviso | Avisado por CP-6.4.2 | 1. Actualizar mi fila de `en_espera` a `anotado`. | Se acepta, quedo ocupando el lugar liberado. | Funcional | Alta |
| CP-6.4.4 | No se puede sobrellenar el partido por la vía directa | Partido con cupo lleno | 1. Un jugador nuevo (nunca participó) intenta insertarse con `estado: 'anotado'` directo, saltando la lista de espera. | El servidor rechaza el insert ("El partido ya no tiene lugares disponibles") — antes de la corrección (BUG-021), el chequeo de cupo quedaba ciego por RLS para cualquiera que todavía no fuera participante, y el insert se aceptaba igual. | Seguridad | Alta |

## US-6.5 — Marcar inasistencia (no-show)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-6.5.1 | Organizador marca no-show de un confirmado, partido ya jugado | Partido `jugado`, organizador propio | 1. Marcar no-show a un participante confirmado. | Se acepta, `no_show=true` en esa fila. | Funcional | Alta |
| CP-6.5.2 | No se puede marcar no-show en un partido que todavía no se jugó | Partido futuro/abierto, mismo organizador | 1. Intentar marcar no-show igual (API directa). | El servidor lo rechaza ("No autorizado o el partido todavía no se jugó"). | Negativo | Media |
| CP-6.5.3 | Un organizador no puede reescribir el `estado` de otro jugador aprovechando el mecanismo de no-show | Partido propio con otro confirmado | 1. `PATCH` directo sobre la fila de ese jugador cambiando `estado` (no `no_show`). | El servidor rechaza (0 filas afectadas) — antes de la corrección (BUG-019), el organizador podía reescribir libremente el `estado` de cualquier participante de su partido, rompiendo el flujo de confirmación de asistencia (US-2.4). | Seguridad | Crítica |
| CP-6.5.4 | Contador de no-shows visible en el perfil de otro jugador | Jugador con al menos 1 no-show | 1. Ver su perfil desde el Directorio/mensajería. | Se ve "🚫 No-shows: N" — antes de la corrección (BUG-020), este contador no existía en ningún lado a pesar de ser un criterio de aceptación explícito. | Funcional | Media |

## US-6.6 — Partidos recurrentes

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-6.6.1 | "Repetir este partido" disponible en un partido pasado propio | Partido jugado/cancelado, organizador propio | 1. Ver su detalle. | Aparece el botón "🔁 Repetir este partido". | Funcional | Media |
| CP-6.6.2 | Precarga correcta en "Crear partido" | Ídem | 1. Tocar "Repetir". | Se abre `/crear-partido` con cancha, cantidad de jugadores, punto de oro y rango de nivel precargados; solo falta la fecha. | Funcional | Alta |

## US-6.7 — Compartir un partido por link

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-6.7.1 | Vista pública accesible sin sesión | Cualquier partido | 1. Llamar `ver_partido_publico(p_id)` sin header de sesión (rol `anon`). | Devuelve fecha, cancha, cupos, estado — sin nombres ni teléfonos de participantes. | Seguridad/Funcional | Alta |
| CP-6.7.2 | "Sumarme" desde la vista pública pide login primero | Visitante sin sesión | 1. Tocar "Sumarme" en `/p/[id]`. | Redirige a login; al volver, queda anotado directo en ese partido (no tiene que volver a buscarlo). | Funcional | Media |

## Resultado de la ejecución (2026-09-06/07)

- CP-6.1.1/6.1.2/6.1.3 ✅ Pasan — verificado en la construcción original de US-6.1 (BUG-014, `mi_historial_partidos` nunca corrida, corregido y reverificado).
- CP-6.2.1 a CP-6.2.4 ✅ Pasan — lógica de filtro revisada en código (`ListaPartidosForm.js`), es un filtro cliente-side simple y correcto sobre los datos ya traídos; sin casos borde encontrados.
- CP-6.3.1 ✅ Pasa. CP-6.3.2 ✅ Pasa — jugador de nivel 3 se sumó sin problema a un partido con rango 6ª-7ª (verificado con API directa). CP-6.3.3 ✅ Pasa por revisión de código (`fueraDeNivel`, cálculo correcto y no bloqueante).
- CP-6.4.1 ✅ Pasa (tras corregir **BUG-022**). CP-6.4.2 ✅ Pasa (tras corregir **BUG-025**) — verificado con partido limpio: solo el primero de la lista fue notificado. CP-6.4.3 ✅ Pasa. CP-6.4.4 ✅ Pasa (tras corregir **BUG-021**) — verificado que un jugador nuevo ya no puede sobrellenar el partido.
- CP-6.5.1 ✅ Pasa. CP-6.5.2 ✅ Pasa — intento sobre partido no jugado rechazado con el mensaje esperado. CP-6.5.3 ✅ Pasa (tras corregir **BUG-019**, crítico) — el ataque directo de reescritura de `estado` ya no tiene efecto. CP-6.5.4 ✅ Pasa (tras corregir **BUG-020**).
- CP-6.6.1 ✅ Pasa. CP-6.6.2 ✅ Pasa — verificado en el navegador (deploy de Vercel): cancha, cantidad, nivel y punto de oro precargados correctamente.
- CP-6.7.1 ✅ Pasa (tras correr **BUG-026**, la migración 027 nunca se había ejecutado) — `fetch` sin `Authorization` devuelve los datos públicos correctos, sin datos sensibles. CP-6.7.2 ⚪ No re-ejecutado en esta ronda (verificado funcionalmente en una sesión anterior al construir la historia; el mecanismo de `sessionStorage.setItem('volverA', ...)` no cambió).

**6 bugs nuevos encontrados y corregidos en esta ronda:**
- **BUG-019 (Crítica):** organizador podía reescribir el `estado` de cualquier participante de su partido (no solo `no_show`) por falta de restricción de columna, igual patrón que BUG-009.
- **BUG-020:** contador de no-shows nunca se agregó al perfil, pese a ser un criterio de aceptación explícito.
- **BUG-021 (Alta):** el chequeo de cupo al anotarse (`validar_cupo_para_anotarse`) nunca fue `SECURITY DEFINER` — su propio conteo interno quedaba ciego por RLS para cualquier jugador que todavía no fuera participante del partido, dejando el cupo sin aplicar realmente desde la Épica 2.
- **BUG-022 (Alta):** la política de INSERT nunca se actualizó para permitir `estado='en_espera'` — la lista de espera completa (US-6.4) estaba rota, siempre devolvía 403.
- **BUG-025:** el aviso de "se liberó un lugar" se disparaba en cascada a toda la lista de espera en vez de solo al primero, por una recursión de trigger no controlada.
- **BUG-026:** la migración de US-6.7 (`ver_partido_publico`) nunca se había ejecutado contra la base real.
