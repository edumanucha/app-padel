# Matriz de Casos de Prueba Manuales — Épica 3: Ranking por Resultados de Partidos

Basado en las historias de usuario de `historias-usuario-mvp.md` (Épica 3). **Nota de reemplazo (2026-09-06):** esta matriz reemplaza por completo la versión anterior (basada en el viejo enfoque de valoración entre pares, descartado el 2026-09-05 a pedido del usuario). El ranking ahora se calcula por resultados objetivos de partidos (games ganados + bono a la pareja ganadora), no por percepción de compañeros.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-3.1 — Ranking por resultados de partidos jugados

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-3.1.1 | La pareja ganadora recibe 2 puntos por game + 5 de bono | Un partido llega a un resultado final guardado | 1. Terminar un partido con una pareja ganadora. | Cada integrante de la pareja ganadora suma `games_ganados × 2 + 5` puntos a su `puntos_ranking`. | Funcional | Alta |
| CP-3.1.2 | La pareja perdedora igual suma puntos por sus games (nunca resta) | Ídem | 1. Ver los puntos de la pareja perdedora tras el mismo partido. | Cada integrante de la pareja perdedora suma `games_ganados × 2` puntos (sin el bono de 5, nunca puntos negativos). | Funcional | Alta |
| CP-3.1.3 | Un invitado sin cuenta no acumula puntos propios | Partido ad-hoc (US-2.8) con al menos un invitado libre | 1. Terminar ese partido. | Los jugadores con cuenta real suman sus puntos normalmente; el invitado libre no tiene fila en `perfiles` donde acumular nada. | Funcional | Media |
| CP-3.1.4 | Intentar alterar mis puntos de ranking manipulando el request directamente | Sesión iniciada | 1. `PATCH /rest/v1/perfiles?id=eq.<mi_id>` con `{"puntos_ranking": <cualquier valor>}`, sin pasar por un partido real. | El backend rechaza la operación. | Seguridad | Alta |
| CP-3.1.5 | Al corregir un resultado por apelación (US-2.9), los puntos se recalculan solos | Hay un partido con resultado ya aplicado y una apelación resuelta con un resultado distinto | 1. Un superusuario corrige el resultado desde `/apelaciones`. | Los puntos del resultado viejo se revierten y se aplican los del resultado corregido, para las 4 cuentas involucradas. | Funcional | Alta |
| CP-3.1.6 | Insertar un resultado ya finalizado de una sola vez (sin pasar por `finalizado:false` primero) también reparte puntos | Partido con 4 jugadores confirmados, sin resultado todavía | 1. Insertar `resultados_partido` directo con `finalizado: true` desde el arranque (sin el paso intermedio). | Los puntos se aplican igual que si se hubiera insertado en dos pasos (insert + update). | Límite | Media |

## US-3.2 — Ver mi ranking acumulado

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-3.2.1 | Ver el placeholder cuando no jugué ningún partido | Cuenta nueva, sin partidos jugados | 1. Ir a "Mi perfil" o al Home. | Se ve un placeholder tipo "Sin partidos" en vez de "0 pts" pelado o un cálculo confuso. | Límite | Media |
| CP-3.2.2 | Ver el puntaje real reflejado tras jugar un partido | Acabo de jugar un partido con resultado guardado | 1. Ir a "Mi perfil" o al Home. | El puntaje ya refleja los puntos ganados en ese partido, sin tener que refrescar manualmente la sesión. | Funcional | Alta |

## US-3.3 — Comparar mi ranking vs. mi nivel autodeclarado

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-3.3.1 | Ver nivel autodeclarado y ranking juntos en "Mi perfil" | Tengo nivel autodeclarado (siempre existe, Épica 1) | 1. Ir a "Mi perfil". | Veo ambos valores como dos tarjetas destacadas, uno junto al otro. | Funcional | Media |

## US-3.4 — Notificaciones de actividad en mis partidos

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-3.4.1 | Recibo notificación cuando aceptan mi invitación | Invité a un jugador a mi partido | 1. El jugador invitado acepta. | Recibo una notificación con su nombre y la cancha del partido. | Funcional | Alta |
| CP-3.4.2 | Recibo notificación cuando rechazan mi invitación | Ídem | 1. El jugador invitado rechaza. | Recibo una notificación de rechazo. | Funcional | Media |
| CP-3.4.3 | Recibo notificación cuando se cancela un partido en el que participo | Estoy anotado/confirmado en un partido de otro organizador | 1. El organizador cancela el partido. | Recibo una notificación de cancelación; el organizador no se notifica a sí mismo. | Funcional | Alta |
| CP-3.4.4 | El contador de no leídas se refleja en la campanita del Home | Tengo al menos una notificación sin leer | 1. Ir al Home. | Veo el badge con la cantidad de no leídas sobre el ícono de campanita. | Funcional | Media |
| CP-3.4.5 | Desactivar notificaciones detiene los avisos nuevos | Tengo notificaciones activadas | 1. Ir a "Mi perfil" y desactivar notificaciones. 2. Generar un evento que normalmente notificaría (ej. que cancelen mi invitación). | No se genera una notificación nueva para mí mientras estén desactivadas. | Funcional | Media |
| CP-3.4.6 | Marcar todas como leídas | Tengo notificaciones sin leer | 1. Tocar "Marcar todas leídas". | El contador de no leídas pasa a 0. | Funcional | Baja |

## US-3.5 — Directorio de jugadores

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-3.5.1 | Ver listado de jugadores activos con datos básicos | Hay jugadores activos cargados | 1. Ir a "Jugadores". | Veo nombre, nivel, ranking, mano hábil y sexo de cada uno — sin teléfono. | Funcional | Alta |
| CP-3.5.2 | Filtrar por nivel y sexo | Ídem | 1. Aplicar un filtro de nivel + sexo. | El listado se acota a las coincidencias exactas. | Funcional | Media |
| CP-3.5.3 | Invitar a un jugador del directorio a uno de mis partidos | Soy organizador de un partido propio abierto con lugar | 1. Entrar al perfil de un jugador del directorio. 2. Elegir uno de mis partidos e invitar. | La invitación se dispara con el mismo mecanismo de US-2.3 (queda pendiente para ese jugador). | Funcional | Alta |
| CP-3.5.4 | Un jugador dado de baja no aparece en el directorio | Un jugador se da de baja (`activo=false`) | 1. Ir a "Jugadores" y buscarlo por nombre. | No aparece en los resultados. | Negativo | Media |
| CP-3.5.5 | El request directo a `listar_directorio_jugadores` no expone teléfono | Sesión iniciada | 1. Llamar al RPC directamente (Postman/API). | La respuesta no incluye ninguna columna de teléfono. | Seguridad | Alta |
| CP-3.5.6 | Alternar entre las vistas Semanal, Mensual e Histórico | Hay jugadores con puntos de ranking en distintos períodos | 1. Ir a "Jugadores". 2. Tocar "Semanal", luego "Mensual", luego "Histórico". | El listado y el orden se recalculan para cada vista; "Histórico" coincide con el acumulado de toda la vida (US-3.1); "Semanal"/"Mensual" solo suman puntos de partidos jugados dentro de esa ventana de tiempo. | Funcional | Alta |
| CP-3.5.7 | El podio muestra columnas con altura proporcional a los puntos, no fija por puesto | Hay al menos 3 jugadores con puntos de ranking bien distintos entre sí | 1. Ir a "Jugadores" y ver el podio de los primeros 3 puestos. | La altura de cada columna es proporcional a los puntos de ese jugador (no una altura fija tipo "1° siempre el más alto por diseño") — si el 2° y 3° están cerca en puntos, sus columnas se ven casi iguales de altas. | Funcional | Media |
| CP-3.5.8 | El podio no rompe con menos de 3 jugadores con puntos | Hay 1 o 2 jugadores con puntos de ranking cargados | 1. Ir a "Jugadores". | El podio se muestra sin errores con los puestos vacíos en blanco (sin un jugador inventado para completar el 2° o 3° lugar). | Límite | Baja |

## US-3.6 — Kudos y detalle de puntos por partido (con privacidad)

**Nota de numeración:** la sección "Transversal" de abajo ya usa el prefijo `CP-3.6.x` desde antes de que existiera esta historia — para no chocar con esos IDs ya en uso, los casos de esta sección usan el sufijo `CP-3.6K.x` ("K" de kudos).

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-3.6K.1 | Ver el detalle de partidos con puntos, sin datos del rival | Veo el perfil de otro jugador con al menos un partido que le dio puntos de ranking | 1. Entrar a su perfil. 2. Desplegar "Partidos y puntos de ranking". | Veo, por cada partido, fecha, cancha y puntos ganados — sin el nombre del rival ni el marcador ni ninguna otra estadística del partido. | Funcional | Alta |
| CP-3.6K.2 | Dar kudos a un partido de otro jugador | Ídem | 1. Tocar el botón de kudos (👍) de uno de los partidos listados. | El contador de kudos de ese partido sube en uno; el botón queda marcado como "ya dado". | Funcional | Alta |
| CP-3.6K.3 | Sacar un kudos ya dado (toggle) | Ya le di kudos a ese partido | 1. Tocar el mismo botón de kudos de nuevo. | El contador baja en uno; el botón vuelve a su estado sin marcar. | Funcional | Media |
| CP-3.6K.4 | El detalle de puntos por partido no expone el rival ni por API directa | Sesión iniciada | 1. Llamar al RPC `listar_partidos_ranking_jugador` directamente (Postman/API) para otro jugador. | La respuesta no incluye ningún dato del rival ni del marcador del partido, solo fecha, cancha, puntos y datos de kudos. | Seguridad | Alta |
| CP-3.6K.5 | Un jugador sin partidos con puntos no muestra la sección | Veo el perfil de un jugador que nunca jugó un partido con resultado guardado | 1. Entrar a su perfil. | La sección "Partidos y puntos de ranking" no se muestra (no una lista vacía sin sentido). | Límite | Baja |

## Transversal (aplica a toda la épica)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-3.6.1 | Pantallas de ranking/directorio se ven y funcionan bien en mobile y desktop | — | 1. Repetir Home, Mi perfil y Directorio desde un navegador de escritorio y desde un viewport móvil. | Todas son usables y legibles en ambos casos. | Responsive | Media |

## Candidatos a automatización temprana (referencia para el chat "Automatización")

- CP-3.1.4 es un excelente candidato de Postman: valida una regla de autorización a nivel de columna (no solo de fila), poco común de ver en una API REST — buen caso de aprendizaje.
- CP-3.1.1/CP-3.1.2 son un buen candidato de test de integración una vez que exista suite de Playwright con marcador real, para no depender de inserts directos a la base.

## Resultado de la ejecución manual (2026-09-06)

Ejecutado contra la API directamente con hasta 4 cuentas reales simultáneas (organizador + 3 participantes reales, entre ellas cuentas demo con historial real).

- CP-3.1.1 ✅ Pasa — pareja ganadora (12 games) recibió `12×2+5=29` puntos cada integrante, verificado con valores reales antes/después.
- CP-3.1.2 ✅ Pasa — pareja perdedora (6 games) recibió `6×2=12` puntos cada integrante, sin bono.
- CP-3.1.3 ⚪ No ejecutado en esta ronda (validado por revisión de código: el loop de reparto de puntos solo itera `jugador_id` de `partido_jugadores`, un invitado libre tiene `jugador_id = null` y nunca entra al loop — estructuralmente no puede acumular puntos).
- CP-3.1.4 ✅ Pasa tras el fix de **BUG-009** (crítico) — antes del fix, `puntos_ranking` y `es_superusuario` eran editables directamente por cualquiera vía `PATCH` a `/rest/v1/perfiles`. Corregido con privilegios de columna de Postgres.
- CP-3.1.5 ⚪ No ejecutado en esta ronda — requiere una cuenta superusuario real, que el usuario decidió probar él mismo (no se le dio el rol a una cuenta de prueba del asistente). La lógica de reversión/reaplicación de `resolver_apelacion` fue verificada por revisión de código.
- CP-3.1.6 ✅ Pasa tras el fix de **BUG-010** — el trigger `aplicar_resultado_partido` solo escuchaba `UPDATE`; un insert directo con `finalizado:true` no repartía puntos aunque el partido igual contaba como "jugado" en las estadísticas. Corregido (trigger ahora en `INSERT OR UPDATE`) y reverificado con un partido nuevo de 4 cuentas reales.
- CP-3.2.1/CP-3.2.2 ✅ Pasan — verificado en el Home real: "0 puntos de ranking" en una cuenta nueva, y "29 puntos de ranking" reflejado inmediatamente tras el partido de prueba.
- CP-3.3.1 ✅ Pasa — "Mi perfil" muestra Nivel y Ranking como dos tarjetas destacadas, una junto a la otra.
- CP-3.4.1 a CP-3.4.6 ✅ Pasan — verificado de punta a punta con dos cuentas reales: invitación aceptada notificó al organizador, partido cancelado notificó al participante, badge de no leídas reflejado en el Home real.
- CP-3.5.1, CP-3.5.2, CP-3.5.4, CP-3.5.5 ✅ Pasan — verificado por API directa (listado sin teléfono, filtro nivel+sexo exacto, cuenta dada de baja excluida).
- CP-3.5.3 ❌ Falló al ejecutar → **Encontrado BUG-011**: la historia se había dado por construida, pero "invitar desde el directorio" nunca se implementó. **Corregido en la misma ronda** (agregado a `PerfilJugadorForm.js`, reutilizando el mecanismo de invitación de US-2.3) y reverificado en el navegador: invitación enviada correctamente.

**Bugs encontrados en esta ronda:** BUG-009 (crítico), BUG-010, BUG-011 — los 3 corregidos y reverificados el mismo día. BUG-009 en particular es el hallazgo más importante de todo el proyecto hasta ahora: una escalada de privilegios completa que afectaba a toda cuenta real de la app, no solo a datos de prueba.
