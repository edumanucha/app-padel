# Matriz de Casos de Prueba Manuales — Épica 9: Mejoras al Directorio de Canchas

Basado en las historias de usuario de `historias-usuario-mvp.md` (sección "Post-MVP: Épicas de mejoras"). Ejecutada de punta a punta (API directa + navegador) el 2026-09-07, con 1 bug real encontrado y corregido (BUG-027) — ver detalle en `registro-errores.md`.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-9.1 — Reseñas y puntuación de canchas

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-9.1.1 | Dejar una reseña de una cancha donde jugué | Jugué un partido con resultado guardado en una cancha que coincide por nombre con una del Directorio | 1. Entrar al detalle de esa cancha. 2. Elegir puntuación y comentario. 3. Enviar. | Se guarda la reseña; pasa a verse "¡Gracias por tu reseña!" en vez del formulario. | Funcional | Alta |
| CP-9.1.2 | Ver puntuación promedio y reseñas de otros | Cancha con 1+ reseñas | 1. Entrar a su detalle. | Se ve "⭐ promedio · cantidad" y el listado de reseñas (nombre + estrellas + comentario). | Funcional | Alta |
| CP-9.1.3 | No puedo reseñar una cancha donde nunca jugué | Cancha sin ningún partido jugado propio que coincida por nombre | 1. Intentar enviar una reseña igual (API directa). | Rechazado por RLS ("Solo podés puntuar canchas donde ya jugaste un partido con resultado guardado"). | Seguridad | Alta |
| CP-9.1.4 | No puedo reseñar dos veces la misma cancha | Ya dejé una reseña de esta cancha en una sesión anterior | 1. Volver a entrar al detalle de esa cancha. | Se ve directamente "¡Gracias por tu reseña!", sin mostrar el formulario de nuevo — **antes de la corrección (BUG-027), el formulario volvía a aparecer y, al reenviar, se veía el error crudo de Postgres ("duplicate key value violates unique constraint...") en vez de un mensaje claro.** | Límite | Media |
| CP-9.1.5 | Mensaje claro si igual se llega a reenviar (defensa en profundidad) | Ídem, forzando el envío | 1. Reenviar la reseña de todas formas. | Mensaje "Ya dejaste una reseña para esta cancha." (ya no el error crudo de la base). | Negativo | Baja |

## US-9.2 — Panel de administración de canchas

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-9.2.1 | Superusuario crea una cancha nueva | Cuenta con `es_superusuario = true` | 1. Entrar al panel. 2. "+ Nueva cancha", completar y guardar. | Se crea la fila en `canchas`; aparece de inmediato en el Directorio para cualquier jugador. | Funcional | Alta |
| CP-9.2.2 | Superusuario edita una cancha existente | Ídem | 1. Tocar una cancha del listado del panel, cambiar un dato, guardar. | Se actualiza y se refleja en el Directorio/detalle. | Funcional | Alta |
| CP-9.2.3 | Un usuario común no ve el panel | Cuenta sin `es_superusuario` | 1. Entrar a la ruta del panel. | Pantalla "Esta pantalla es solo para administradores." (gate de UI). | Funcional | Media |
| CP-9.2.4 | Un usuario común no puede crear/editar canchas por API directa | Ídem | 1. `INSERT`/`UPDATE` directo en `canchas` (saltando la UI). | Rechazado por RLS ("Superusuario crea canchas" / "Superusuario edita canchas") — mismo criterio de autorización que ya protege `resolver_apelacion` (US-2.9). | Seguridad | Alta |

## Resultado de la ejecución (2026-09-07)

- CP-9.1.1 ✅ Pasa. CP-9.1.2 ✅ Pasa. CP-9.1.3 ✅ Pasa (verificado con API directa, cuenta sin partidos en esa cancha). CP-9.1.4 ✅ Pasa **tras corregir BUG-027**. CP-9.1.5 ✅ Pasa tras la misma corrección.
- CP-9.2.1 y CP-9.2.2 ✅ Pasan por revisión de código (`AdminCanchasForm.js`, flujo estándar de alta/edición sin casos borde). CP-9.2.3 ✅ Pasa (gate de UI presente). CP-9.2.4 ✅ Pasa — políticas RLS correctamente restringidas a `es_superusuario`, mismo patrón ya probado en US-2.9.

**1 bug nuevo encontrado y corregido en esta ronda:**
- **BUG-027 (Media):** el formulario de "Dejar tu reseña" en el detalle de una cancha no revisaba si el jugador ya había reseñado esa cancha en una sesión anterior (el estado `resenaEnviada` solo vivía en memoria del componente) — volvía a aparecer en cada visita, y al reenviar, el jugador se topaba con el mensaje crudo de la restricción `unique(cancha_id, jugador_id)` de Postgres en vez de un aviso entendible. Corregido en `DetalleCanchaForm.js`: se consulta la propia reseña al cargar la pantalla (oculta el formulario si ya existe) y se agregó manejo explícito del código `23505` como defensa en profundidad.
