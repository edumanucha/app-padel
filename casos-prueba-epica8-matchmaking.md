# Matriz de Casos de Prueba Manuales — Épica 8: Matchmaking Proactivo

Basado en las historias de usuario de `historias-usuario-mvp.md` (sección "Post-MVP: Épicas de mejoras"). Última épica del backlog, construida después de las Épicas 6, 7, 9 y 10 por ser la que más diseño de algoritmo nuevo requería. Ejecutada de punta a punta (API directa con cuentas frescas) el 2026-09-07, con 1 bug real encontrado y corregido (BUG-028) — ver detalle en `registro-errores.md`.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-8.1 — Declarar disponibilidad habitual y recibir sugerencias de grupo

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-8.1.1 | Declarar disponibilidad habitual | Sesión iniciada | 1. Elegir día + franja. 2. "Agregar". | Queda guardada y visible en "Mis horarios habituales". | Funcional | Alta |
| CP-8.1.2 | Se arma la sugerencia al completar 4 compatibles | 4 cuentas con misma zona, nivel similar (±1), mismo día/franja | 1. Las 4 declaran esa disponibilidad (en cualquier orden). | Al declarar la 4ta, se crea un grupo de 4 y les llega una notificación `sugerencia_grupo` a cada una; las 3 primeras no disparan nada por sí solas (verificado: con 1, 2 o 3 personas no se arma nada; recién con la 4ta). | Funcional | Alta |
| CP-8.1.3 | Compatibilidad por zona exacta y nivel ±1 | Candidatos con zona distinta o nivel muy dispar | 1. Declarar disponibilidad sin candidatos realmente compatibles. | No se arma ningún grupo (0 candidatos válidos). | Límite | Media |
| CP-8.1.4 | Aceptar la sugerencia | Grupo pendiente, mi fila en estado `pendiente` | 1. Tocar "Confirmar". | Mi fila pasa a `aceptado`; sigo viendo "esperando al resto" hasta que falten confirmar los demás. | Funcional | Alta |
| CP-8.1.5 | Se arma el partido real cuando los 4 aceptan | Grupo con 4/4 aceptados | 1. Los 4 confirman. | Se crea un `partido` real (`estado='abierto'` → pasa a `completo` por el trigger de cupo existente), con los 4 como participantes confirmados; el organizador es uno de los 4 (criterio determinístico); notificación a los 4 avisando que se armó el partido. Verificado de punta a punta con 4 cuentas frescas: partido creado con `estado='completo'`. | Funcional | Alta |
| CP-8.1.6 | Rechazar busca un reemplazo, no rompe todo el grupo | Grupo con 3/4 ya aceptados, candidato de reemplazo compatible disponible (misma zona/nivel/día/franja, sin usar) | 1. El 4to jugador rechaza. | El sistema encuentra UN reemplazo compatible (sin notificar a más de uno), lo suma al grupo como `pendiente`, y **resetea a `pendiente` a los 3 que ya habían aceptado** (tienen que reconfirmar con la nueva formación) — antes de la corrección (**BUG-028**), esto rompía el grupo entero (`estado='roto'`) para las 4 personas, sin buscar reemplazo. Reverificado: reemplazo detectado correctamente, los 3 vuelven a "pendiente", y si todos (incluido el reemplazo) confirman de nuevo, se arma el partido real igual que en CP-8.1.5. | Funcional | Alta |
| CP-8.1.7 | Rechazar sin reemplazo disponible deja el lugar abierto, no completa de menos | Grupo con 2/4 aceptados, sin ningún candidato de reemplazo compatible | 1. Un 4to jugador rechaza (sin reemplazo posible). 2. El jugador restante que faltaba confirma. | El grupo sigue "pendiente" con 3/4 (el rechazo queda registrado pero no cuenta como aceptado) — **no se arma un partido con solo 3 jugadores**. Verificado con API directa: tras el rechazo sin reemplazo y la confirmación del último jugador activo, `aceptados=3` de `total=4`, sin partido creado. | Límite | Alta |
| CP-8.1.8 | Sugerencia de compañero fijo por compatibilidad de dupla (Épica 7) — no aplica acá | — | — | (No es de esta historia, ver Épica 7). | — | — |

## US-8.2 — Buscar compañero fijo (dupla estable)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-8.2.1 | Activar la búsqueda y ver candidatos de posición complementaria | Sesión iniciada, posición = drive | 1. Activar "Buscar compañero fijo". | Veo candidatos con `posicion='reves'`, `busca_companero=true` y `activo=true`; nunca de mi misma posición. Verificado con API directa. | Funcional | Alta |
| CP-8.2.2 | Marcar interés unilateral no vincula nada todavía | Dos cuentas de posición complementaria, ambas buscando | 1. A marca interés en B. | Se guarda el interés (`intereses_dupla`), pero NO se crea ninguna dupla ni notificación — el RPC devuelve `false`. | Funcional | Alta |
| CP-8.2.3 | Match mutuo vincula la dupla | Ídem, ahora B también marca interés en A | 1. B marca interés en A. | El RPC devuelve `true`; se crea la fila en `duplas`, visible para ambos en "Mis duplas"; B recibe notificación `dupla_vinculada`. Verificado con API directa: ambos ven la dupla vinculada. | Funcional | Alta |
| CP-8.2.4 | Invitar directo a mi dupla vinculada a un partido | Dupla ya vinculada | 1. Armar un partido, invitar a la dupla. | Reutiliza el mecanismo estándar de invitación (US-2.3) — sin caso especial que probar aparte, la dupla es simplemente otro jugador para ese flujo. | Funcional | Media |
| — | Desvincular una dupla | — | — | **No implementado.** No existe ningún `DELETE`/RPC para desvincular una dupla ya formada (ni grant de `delete` sobre `duplas`, ni botón en `CompaneroFijoForm.js`) — no es un bug: la propia historia deja esto como pregunta abierta sin resolver ("¿requiere confirmación de ambos, o cualquiera puede hacerlo unilateralmente?"), a diferencia de lo que sí se resolvió (el mínimo de compatibilidad, el match mutuo). Queda pendiente de una decisión de diseño si se lo quiere construir. | — | — |

## Notas de la ronda (condición de carrera)

Se probó deliberadamente el caso de **dos jugadores completando el cupo de 4 al mismo tiempo** (llamadas en paralelo a `guardar_disponibilidad`), para descartar que se armaran dos grupos superpuestos con los mismos 3 candidatos ya usados. En la prueba realizada, el filtro que excluye candidatos ya anotados en un grupo `pendiente` para el mismo día/franja evitó el duplicado (solo se formó un grupo). Este resultado es tranquilizador pero **no descarta al 100%** una carrera más ajustada a nivel de base de datos (dos transacciones leyendo el mismo estado antes de que ninguna confirme) — se documenta como riesgo teórico de baja probabilidad, no como bug confirmado, y no se justificó blindarlo con locks explícitos para el alcance de este proyecto.

## Resultado de la ejecución (2026-09-07)

- CP-8.1.1 a CP-8.1.5 ✅ Pasan. CP-8.1.6 ✅ Pasa **tras corregir BUG-028** (antes rompía todo el grupo). CP-8.1.7 ✅ Pasa tras la misma corrección (verifica el caso "sin reemplazo disponible" no incluido en el reporte original, pero cubierto por el mismo fix).
- CP-8.2.1 a CP-8.2.4 ✅ Pasan todos. Desvincular dupla: gap de diseño documentado, no bug.

**1 bug nuevo encontrado y corregido en esta ronda:**
- **BUG-028 (Alta):** al rechazar una sugerencia de grupo (US-8.1), el sistema rompía TODO el grupo en vez de buscar un reemplazo compatible, como pedía el criterio de aceptación explícito de la historia — verificado en vivo con 4 cuentas frescas (3 ya habían confirmado, se perdía todo al rechazar la 4ta). Corregido según decisión del usuario (2026-09-07): se busca un único reemplazo compatible sin notificar a más candidatos; si se encuentra, los que ya habían confirmado vuelven a "pendiente" (deben reconfirmar con la nueva formación); si no se encuentra, el lugar queda abierto sin romper el grupo ni completarlo de menos.
