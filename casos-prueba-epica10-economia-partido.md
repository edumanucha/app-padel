# Matriz de Casos de Prueba Manuales — Épica 10: Economía del Partido

Basado en las historias de usuario de `historias-usuario-mvp.md` (sección "Post-MVP: Épicas de mejoras"). Ejecutada de punta a punta (API directa + navegador) el 2026-09-07. No se encontraron bugs nuevos.

**Nota importante:** el criterio de aceptación original de US-10.1 ("división simple, total ÷ cantidad de confirmados") quedó desactualizado por un rediseño a pedido del usuario (2026-09-06, antes de esta ronda de pruebas): la funcionalidad real implementada es un cálculo estilo Splitwise (cada persona carga cuánto gastó, el sistema arma quién le debe a quién). Esta matriz prueba el comportamiento **real implementado**, y se actualizó `historias-usuario-mvp.md` para reflejarlo.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-10.1 — Calculadora de gastos del partido (Splitwise)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-10.1.1 | Organizador carga los gastos de su partido | Partido propio | 1. Entrar al detalle. 2. "Cargar gastos", completar nombre + monto por cada persona (con o sin cuenta vinculada). 3. Guardar. | Se guarda en `partidos.gastos`; se ve el total, la parte por persona y quién le debe a quién. | Funcional | Alta |
| CP-10.1.2 | Todos los participantes ven el desglose, no solo el organizador | Partido con gastos cargados | 1. Entrar al detalle como un participante cualquiera (no organizador). | Se ve el mismo desglose completo ("Total: $X entre N — $Y c/u" + lista de "A le debe $Z a B"); el botón "Editar" NO aparece. Verificado en el navegador con una cuenta demo no-organizadora. | Funcional | Alta |
| CP-10.1.3 | Notificación de saldo a quien tiene cuenta vinculada | Gasto con `jugador_id` real y saldo distinto de 0 | 1. El organizador guarda los gastos. | La persona vinculada recibe una notificación `saldo_gastos`: "Te deben $X..." si puso de más, "Debés $X..." si puso de menos. Verificado con API directa: saldo +$4000 → "Te deben $4000", saldo −$2000 → "Debés $2000". | Funcional | Alta |
| CP-10.1.4 | Solo el organizador puede cargar/editar los gastos | Partido ajeno | 1. Un jugador que no es el organizador llama a `guardar_gastos_y_notificar` para ese partido. | Rechazado: "Solo el organizador puede cargar los gastos." | Seguridad | Alta |
| CP-10.1.5 | Gasto sin cuenta vinculada (nombre libre) | — | 1. Cargar un gasto con nombre libre y sin `jugador_id`. | Se guarda y se muestra igual en el desglose; no se intenta notificar a nadie (no hay a quién). Verificado con datos ya cargados en producción ("Invitado de la cancha", "pepe", "nano bano"). | Funcional | Media |
| CP-10.1.6 | Saldo saldado (nadie debe nada) | Todos los montos cargados dan exactamente la parte por persona | 1. Ver el desglose. | Mensaje "Está todo saldado, nadie le debe a nadie." en vez de una lista vacía muda. | Límite | Baja |
| CP-10.1.7 | Aviso de alcance informativo siempre visible | Cualquier partido con gastos | 1. Ver el desglose. | Se ve el texto "Solo informativo — no procesa ningún pago real." (verificado en el navegador). | Funcional | Baja |

## Resultado de la ejecución (2026-09-07)

- CP-10.1.1 ✅ Pasa (verificado por revisión de código + reverificación de datos ya cargados en producción). CP-10.1.2 ✅ Pasa — verificado en el navegador con una cuenta demo no-organizadora viendo el desglose completo de un partido ajeno, sin botón de edición. CP-10.1.3 ✅ Pasa — verificado con API directa, ambos signos de saldo (a favor y en contra) con el mensaje correcto. CP-10.1.4 ✅ Pasa — intento de un jugador ajeno rechazado con el mensaje esperado. CP-10.1.5 ✅ Pasa. CP-10.1.6 y CP-10.1.7 ✅ Pasan por revisión de código.
- **0 bugs nuevos en esta ronda.**
