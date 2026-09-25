# Matriz de Casos de Prueba Manuales — Épica 7: Comunidad entre Jugadores

Basado en las historias de usuario de `historias-usuario-mvp.md` (sección "Post-MVP: Épicas de mejoras"). Ejecutada de punta a punta (API directa con cuentas demo/frescas + navegador) el 2026-09-07. A diferencia de la Épica 6, no se encontraron bugs reales nuevos — todo lo probado funcionó correctamente en la primera pasada.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-7.1 — Lista de jugadores frecuentes

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-7.1.1 | Marcar a otro jugador como frecuente | Sesión iniciada, viendo el perfil de otro jugador | 1. Tocar la estrella ☆ junto al nombre. | Queda insertada la fila en `jugadores_frecuentes` (jugador_id=yo, frecuente_id=el otro); la estrella pasa a ⭐. | Funcional | Alta |
| CP-7.1.2 | Desmarcar un frecuente | Ídem, ya marcado | 1. Tocar la estrella ⭐ de nuevo. | Se borra la fila; la estrella vuelve a ☆. | Funcional | Media |
| CP-7.1.3 | El buscador de invitación prioriza frecuentes | Tengo al menos un frecuente | 1. Abrir "Invitar jugador" en un partido propio, antes de escribir nada. | Se ve la sección "Tus frecuentes" con opción directa de invitar, sin tener que tipear un nombre. | Funcional | Alta |
| CP-7.1.4 | No puedo marcar un frecuente en nombre de otro usuario | — | 1. `INSERT` directo en `jugadores_frecuentes` con `jugador_id` de otra persona. | Rechazado por RLS ("Marcar un frecuente", `with check (jugador_id = auth.uid())`). | Seguridad | Alta |
| CP-7.1.5 | No puedo marcarme a mí mismo como frecuente | — | 1. `INSERT` con `jugador_id = frecuente_id` (mi propio id en ambos). | Rechazado por el `check (jugador_id <> frecuente_id)` de la tabla. | Negativo | Baja |

## US-7.2 — Historial entre jugadores

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-7.2.1 | Ver "jugaste N veces con/contra él" con historial real | Dos jugadores demo con partidos jugados en común (mismo equipo y equipo rival) | 1. Ver el perfil del otro jugador. | Se ven ambas líneas con los conteos correctos (verificado con datos reales: 2 veces con, 1 vez contra). | Funcional | Alta |
| CP-7.2.2 | Sección oculta sin historial compartido | Un jugador con el que nunca compartí un partido jugado | 1. Ver su perfil. | La sección de historial no aparece (veces_con=0 y veces_contra=0). | Límite | Media |

## US-7.3 — Compatibilidad de duplas

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-7.3.1 | Ver % de compatibilidad con ≥2 partidos en el mismo equipo | Par con 2+ partidos jugados como compañeros | 1. Ver su perfil. | Se ve "🤝 N% de victorias jugando en pareja" (verificado: 2 partidos juntos, 100%). | Funcional | Alta |
| CP-7.3.2 | % oculto con solo 1 partido en común (umbral de significancia) | Par con exactamente 1 partido como compañeros | 1. Ver su perfil. | Se ve el historial (veces_con=1) pero NO el % de compatibilidad (evita mostrar "100%" con una sola muestra, según la pregunta abierta de la historia resuelta así). | Límite | Media |
| — | Sugerencia proactiva de compañero por compatibilidad | — | — | **No implementado.** El segundo criterio de aceptación de US-7.3 ("puede sugerirme, de forma no bloqueante, compañeros con buena compatibilidad histórica") no tiene código asociado — no es un bug, la propia historia lo deja como pregunta abierta sin resolver ("¿la sugerencia es un cartel proactivo, o solo si el jugador la busca explícitamente?"), a diferencia del umbral de "2 partidos" que sí se resolvió y se implementó. Queda pendiente de una ronda de diseño si se lo quiere construir. | — | — |

## US-7.4 — Mensajería directa

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-7.4.1 | Enviar un mensaje desde el perfil de otro jugador | Sesión iniciada | 1. Tocar "💬 Enviar mensaje" en su perfil. 2. Escribir y enviar. | Se abre la conversación 1 a 1; el mensaje queda guardado y visible con fecha y hora. | Funcional | Alta |
| CP-7.4.2 | Notificación al destinatario | Destinatario con notificaciones activas | 1. Enviar un mensaje. | Al destinatario le llega una notificación de campanita tipo `mensaje_nuevo` (mismo mecanismo de US-3.4), verificado en el navegador con dos cuentas reales. | Funcional | Alta |
| CP-7.4.3 | Bandeja de conversaciones con no leídos | Conversación con mensajes sin leer | 1. Entrar a "Mensajes". | Se lista la conversación con último mensaje y contador de no leídos; al entrar a la conversación se marca como leída y el contador desaparece. | Funcional | Alta |
| CP-7.4.4 | Tiempo real (Supabase Realtime) | Dos sesiones en la misma conversación | 1. Verificado que la tabla `mensajes` está habilitada en la publicación `supabase_realtime` (`pg_publication_tables`). | La tabla está correctamente habilitada para notificar mensajes nuevos en vivo sin recargar. | Funcional | Media |
| CP-7.4.5 | No puedo leer conversaciones ajenas | Tres cuentas: A, C (conversación entre ellas) y D (ajena) | 1. D intenta `SELECT` sobre `mensajes` filtrando por la conversación de A y C. | Devuelve 0 filas (RLS: solo remitente o destinatario ven la fila). | Seguridad | Alta |
| CP-7.4.6 | No puedo marcar como leído un mensaje ajeno | Ídem | 1. D intenta `UPDATE leido=true` sobre un mensaje de la conversación A-C. | 0 filas afectadas (RLS: `using (destinatario_id = auth.uid())`). | Seguridad | Alta |
| CP-7.4.7 | El remitente no puede reescribir el contenido de su propio mensaje ya enviado | — | 1. El remitente intenta `UPDATE contenido` sobre un mensaje propio. | Rechazado ("permission denied for table mensajes") — el `GRANT` solo autoriza `UPDATE (leido)`, mismo patrón de columna-restringida que corrigió BUG-009/BUG-019. | Seguridad | Media |
| CP-7.4.8 | No puedo enviarme un mensaje a mí mismo | — | 1. `enviar_mensaje` con destinatario = yo mismo. | Rechazado por el `check (remitente_id <> destinatario_id)`. | Negativo | Baja |
| CP-7.4.9 | Validación de longitud del contenido | — | 1. Enviar contenido vacío. 2. Enviar contenido de 1001 caracteres. | Ambos rechazados por `check (char_length(contenido) between 1 and 1000)`. | Límite | Media |
| CP-7.4.10 | Reportar un mensaje/usuario (moderación básica) | Sesión iniciada | 1. Tocar "Reportar" en una conversación, escribir motivo, enviar. | Se guarda en `reportes_mensajes` con `reportado_por` = quien reporta; solo el superusuario puede verlo (`SELECT` de un usuario común devuelve 0 filas, ni siquiera sus propios reportes). | Funcional | Media |
| CP-7.4.11 | No puedo reportar impersonando a otro usuario | — | 1. `INSERT` en `reportes_mensajes` con `reportado_por` de otra persona. | Rechazado por RLS (`with check (reportado_por = auth.uid())`). | Seguridad | Media |

## Resultado de la ejecución (2026-09-07)

- **US-7.1:** CP-7.1.1 a CP-7.1.5 ✅ Pasan todos. Verificado con dos cuentas frescas en el navegador (marcar/desmarcar visible en vivo) y con API directa para los dos negativos.
- **US-7.2:** CP-7.2.1 y CP-7.2.2 ✅ Pasan. Se encontró un par de cuentas demo con historial real (2 partidos como compañeros, 1 como rivales) para validar ambos conteos a la vez.
- **US-7.3:** CP-7.3.1 y CP-7.3.2 ✅ Pasan — el umbral de "mínimo 2 partidos juntos" para mostrar el % está correctamente implementado. La sugerencia proactiva de compañero (segundo criterio de la historia) sigue siendo una pregunta de diseño abierta, no construida — no se cuenta como bug.
- **US-7.4:** CP-7.4.1 a CP-7.4.11 ✅ Pasan todos, incluyendo los 5 casos de seguridad/negativos. Se verificó en el navegador con dos cuentas reales el flujo completo: mensaje → notificación de campanita → bandeja con no-leídos → conversación → respuesta → marcado de leído.

**0 bugs nuevos en esta ronda.** Dos falsas alarmas descartadas durante la investigación (quedan documentadas acá para no repetir la confusión en una futura ronda):
1. Un primer intento de reportar un mensaje devolvió 403 de RLS — resultó ser un artefacto del script de prueba, que por defecto pedía `Prefer: return=representation` (fuerza a Postgres a releer la fila insertada, chocando con la política de `SELECT` que solo deja ver al superusuario). El código real de la app (`ConversacionForm.js`) usa `.insert()` sin `.select()`, que en `supabase-js` v2 usa `Prefer: return=minimal` por defecto — no se ve afectado. Confirmado corriendo la misma inserción con `return=minimal`: `201`.
2. Al probar en el navegador con dos pestañas abiertas a la vez (una cuenta en cada una), la búsqueda del Directorio devolvió un resultado incompleto — resultó ser que ambas pestañas comparten el mismo `localStorage` (mismo origen), así que loguearse en la segunda pestaña sobrescribió la sesión de la primera. La cuenta buscada no aparecía porque el buscador la excluye a sí misma de su propio directorio (`pe.id <> auth.uid()`), y la pestaña "vieja" en realidad ya operaba como la cuenta nueva. No es reproducible con una sola sesión activa por pestaña.
