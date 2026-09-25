# Matriz de Casos de Prueba Manuales — Épica 4: Directorio de Canchas

Basado en las historias de usuario de `historias-usuario-mvp.md` (Épica 4). Épica acotada: es un directorio de solo lectura para el jugador (sin reservas, sin transacciones), por lo que la matriz es más chica que las anteriores — la complejidad real de esta épica está en la integración con "Crear partido" (US-4.3), no en el listado en sí.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-4.1 — Ver listado de canchas

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-4.1.1 | Ver listado de canchas con datos cargados | Hay al menos una cancha cargada | 1. Ir a "Canchas". | Veo el listado con nombre, descripción y valores de cada cancha. | Funcional | Alta |
| CP-4.1.2 | Ver mensaje cuando no hay canchas cargadas | No hay ninguna cancha cargada en el sistema | 1. Ir a "Canchas". | Veo un mensaje indicando que no hay canchas disponibles, no una pantalla vacía sin explicación. | Límite | Media |
| CP-4.1.3 | El listado de Mendoza refleja los datos reales de los 51 clubes cargados | Provincia del jugador = Mendoza | 1. Ir a "Canchas". | Veo el listado con los clubes reales cargados (nombre, zona, dirección, teléfono, cantidad de canchas), sin duplicados entre el seed original y los 40 clubes agregados de atcsports.io. | Funcional | Media |
| CP-4.1.4 | El listado NO muestra horario, precio ni amenities aunque estén guardados en la base | Cancha real con `descripcion`/`valores` cargados (horario, precio, amenities incluidos) | 1. Ir a "Canchas" y ver esa cancha en el listado. | Solo se ve nombre, zona, dirección, teléfono y cantidad de canchas — horario, precio y amenities no aparecen en esta pantalla (están en la base pero ocultos a propósito). | Negativo | Baja |

## US-4.2 — Ver detalle de una cancha

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-4.2.1 | Ver el detalle completo de una cancha desde el listado | Hay al menos una cancha cargada | 1. Ir a "Canchas". 2. Tocar una cancha del listado. | Veo su información completa: nombre, dirección/zona, descripción, valores y teléfono de contacto. | Funcional | Alta |
| CP-4.2.2 | Volver del detalle al listado sin perder contexto | Estoy en el detalle de una cancha | 1. Tocar "volver". | Regreso al listado completo de canchas. | Funcional | Baja |
| CP-4.2.3 | El link de dirección abre Google Maps y el de teléfono abre WhatsApp | Cancha con dirección y teléfono cargados | 1. Tocar el texto de la dirección. 2. Volver y tocar el botón "WhatsApp". | La dirección abre una búsqueda de Google Maps con el nombre y la dirección de la cancha; el botón "WhatsApp" abre `wa.me` con el teléfono ya formateado (sin caracteres no numéricos). | Funcional | Media |
| CP-4.2.4 | El detalle tampoco muestra horario, precio ni amenities | Ídem CP-4.1.4 | 1. Entrar al detalle de esa cancha. | Igual que en el listado, esos datos no se muestran aunque estén guardados en `canchas.descripcion`/`canchas.valores`. | Negativo | Baja |

## US-4.3 — Elegir una cancha del directorio al crear un partido

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-4.3.1 | Elegir una cancha existente del directorio al crear un partido | Hay al menos una cancha cargada | 1. Ir a "Crear partido". 2. En el campo "cancha", buscar y seleccionar una cancha del directorio. 3. Completar el resto y confirmar. | El partido se crea asociado a esa cancha del directorio (no a texto libre). | Funcional | Alta |
| CP-4.3.2 | Crear un partido con cancha como texto libre cuando el directorio está vacío | No hay ninguna cancha cargada | 1. Ir a "Crear partido". 2. Completar el campo "cancha" escribiendo texto libre. 3. Confirmar. | El partido se crea correctamente con el valor de texto libre (no se bloquea la creación por falta de canchas en el directorio). | Funcional | Media |
| CP-4.3.3 | Acceder al detalle de la cancha elegida desde el detalle del partido | Creé un partido eligiendo una cancha del directorio | 1. Ir al detalle de ese partido. 2. Tocar la cancha asociada. | Accedo al detalle completo de esa cancha (US-4.2), sin tener que buscarla de nuevo desde el listado general. | Funcional | Baja |
| CP-4.3.4 | Un partido creado con `cancha_id` real usa el vínculo directo, no el match por nombre | Creé un partido eligiendo una sugerencia real del autocompletado de `CampoCancha.js` | 1. Ver el detalle del partido y tocar "Ver cancha". 2. Verificar en la base que `partidos.cancha_id` no es `null`. | El link "Ver cancha" lleva directo a la cancha por su id (no depende de que el nombre matchee exacto contra el Directorio). | Funcional | Media |
| CP-4.3.5 | Un partido creado con texto libre (sin elegir sugerencia) queda con `cancha_id` nulo y no rompe el detalle | Creo un partido escribiendo el campo "cancha" a mano, sin elegir ninguna sugerencia del autocompletado | 1. Crear el partido así. 2. Ver su detalle. | El partido se crea igual (`cancha_id = null`); el detalle no se rompe — si el texto matchea por nombre exacto con una cancha real, "Ver cancha" usa ese respaldo heurístico; si no matchea con ninguna, el detalle simplemente no ofrece el link "Ver cancha", sin error. | Límite | Media |

## Transversal (aplica a toda la épica)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-4.4.1 | Pantallas del directorio (listado y detalle) se ven y funcionan bien en mobile y desktop | — | 1. Repetir ver listado y ver detalle desde un navegador de escritorio y desde un viewport móvil. | Ambas pantallas son usables y legibles en los dos casos. | Responsive | Baja |

**Nota:** si en "Crear la app" se confirma que existe alguna pantalla de administración para cargar/editar canchas (ver pregunta abierta en US-4.1 de `historias-usuario-mvp.md`), corresponde sumar acá casos de autorización por rol (ej. un usuario común intentando dar de alta una cancha manipulando la API directamente) — no se incluyen todavía porque no está confirmado que esa pantalla exista en el MVP.

## Candidatos a automatización temprana (referencia para el chat "Automatización")

- CP-4.1.1 y CP-4.2.1 son excelentes primeros candidatos de Postman: son endpoints de solo lectura (GET), sin lógica de negocio compleja ni dependencias de estado — ideales para un smoke test temprano de la API.
- CP-4.3.1 es un buen candidato de Playwright para extender el flujo E2E de "crear partido" ya cubierto en la Épica 2 (crear → sumarse → confirmar), agregando el paso de selección de cancha real.

## Resultado de la ejecución manual (2026-09-06)

- CP-4.1.1 ✅ Pasa — listado de las 40 canchas reales de Mendoza, con nombre, zona y fallback "Consultar valores" cuando no hay precio cargado.
- CP-4.1.2 ⚪ No ejecutado en esta ronda (requiere una provincia sin ninguna cancha seedeada; con el seed actual las 24 provincias tienen al menos 5 canchas de prueba). El mensaje de "sin canchas" está implementado y se verificó por lectura de código.
- CP-4.2.1 ✅ Pasa — detalle completo con dirección, zona, descripción/valores (con fallback) y teléfono + botón de WhatsApp con el número bien formateado.
- CP-4.2.2 ✅ Pasa — "Volver al listado" regresa al listado completo.
- CP-4.3.1 ✅ Pasa (reverificado) — partido creado con una cancha real elegida del directorio.
- CP-4.3.2 ✅ Pasa — el campo admite texto libre si no hay coincidencia (fallback ya verificado desde que se construyó US-4.3 en una sesión anterior).
- CP-4.3.3 ❌ Falló al ejecutar → **Encontrado BUG-012**: el detalle de partido no tenía forma de volver a la cancha elegida. **Corregido en la misma ronda** (botón "Ver cancha" con match por nombre contra el Directorio) y reverificado en el navegador.

**Bug encontrado y corregido en esta ronda:** BUG-012 (ver `registro-errores.md`).
