# Matriz de Casos de Prueba Manuales — Épica 5: Navegación de Funcionalidades Futuras

Basado en las historias de usuario de `historias-usuario-mvp.md` (Épica 5). Épica acotada y de naturaleza distinta a las anteriores: no hay flujo de datos de negocio nuevo, el foco está en la comunicación visual de "Próximamente" (US-5.1) y, sobre todo, en que ese bloqueo sea real a nivel backend y no solo un ocultamiento en la UI (US-5.2) — por eso la proporción de casos de seguridad es más alta que en otras épicas.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-5.1 — Ver ítems de menú bloqueados con badge "Próximamente"

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-5.1.1 | Ver ítems de fases futuras con badge "Próximamente" en el menú | Sesión iniciada | 1. Ir al menú principal. | Los ítems de funcionalidades no implementadas aparecen junto a los activos, cada uno con el badge "Próximamente". | Funcional | Media |
| CP-5.1.2 | Tocar un ítem bloqueado no navega a una pantalla funcional | Ídem | 1. Tocar un ítem del menú marcado como "Próximamente". | No se accede a ninguna pantalla funcional real; se informa que está en desarrollo. | Negativo | Alta |
| CP-5.1.3 | Diferenciar visualmente ítems activos de ítems bloqueados | Ídem | 1. Comparar en el menú un ítem activo contra uno con badge "Próximamente". | La diferencia visual es clara e inequívoca (no genera dudas sobre si algo funciona o no). | Funcional | Baja |

## US-5.2 — Impedir el acceso a funcionalidades bloqueadas manipulando la URL

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-5.2.1 | Intentar acceder por URL a una funcionalidad sin ruta implementada | La funcionalidad de fase futura no tiene ruta/endpoint real todavía | 1. Escribir manualmente en el navegador una URL que apuntaría a esa funcionalidad. | Se muestra una pantalla de error controlada (404 / "no disponible"), nunca una pantalla rota o en blanco. | Seguridad | Alta |
| CP-5.2.2 | Intentar acceder manipulando la API a una funcionalidad con ruta implementada pero no liberada | La funcionalidad ya tiene endpoint en desarrollo activo, pero no está liberada a usuarios | 1. Armar un request directo a ese endpoint (Postman), sin pasar por la UI. | El backend rechaza el acceso con la misma lógica de autorización usada en otras acciones sensibles (ej. CP-2.5.4). | Seguridad | Alta |
| CP-5.2.3 | Verificar que un intento de acceso bloqueado no expone detalles internos | Ídem CP-5.2.1 o CP-5.2.2 | 1. Revisar el mensaje/respuesta de error devuelto. | El mensaje no incluye detalles internos de desarrollo (stack traces, nombres de tablas, rutas de archivos, etc.). | Seguridad | Media |

## US-5.3 — Pantalla principal (Home)

> **Nota (2026-09-06):** historia agregada después de que se escribiera la matriz original — se suman sus casos acá en vez de crear un archivo aparte.

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-5.4.1 | Ver todos los bloques del Home en el orden documentado | Sesión iniciada, perfil completo | 1. Entrar a la app. | Se ven, de arriba a abajo: saludo+ranking, próximo partido, invitaciones (si hay), 2 CTAs, último partido, racha/posición/estadística, publicidad, tip, resto de accesos, "Se viene", pie de página. | Funcional | Alta |
| CP-5.4.2 | Placeholders correctos sin actividad previa | Cuenta nueva, sin partidos jugados | 1. Entrar a la app. | "Sin partidos próximos", "Todavía no jugaste...", racha/% en 0, sin errores. | Límite | Media |
| CP-5.4.3 | El cartel de invitaciones pendientes no ocupa espacio si no aplica | Sin invitaciones pendientes | 1. Entrar a la app. | El cartel no se muestra. | Negativo | Baja |
| CP-5.4.4 | El tip de juego cambia según la posición del perfil | Perfil con posición "drive" o "revés" | 1. Entrar a la app varias veces. | El tip corresponde a la posición declarada, y varía entre visitas (no siempre el mismo). | Funcional | Baja |

## US-5.4 — Instalar la app en el dispositivo (PWA)

> **Nota (2026-09-13):** historia agregada después de que se escribiera la matriz original de esta épica (misma situación que US-5.3) — se suman sus casos acá en una sección nueva, con IDs `CP-5.5.x` para no chocar con los ya usados por US-5.3 (`CP-5.4.x`) ni por "Transversal" (`CP-5.3.x`).

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-5.5.1 | Ver el botón "Instalar" en un navegador que soporta `beforeinstallprompt` | Navegador Android/Chrome/Edge, app no instalada todavía | 1. Entrar a Configuración (o al Home, si no descarté el banner antes). | Se ve el botón "Instalar"; al tocarlo, se dispara el flujo nativo de instalación del navegador. | Funcional | Alta |
| CP-5.5.2 | En iOS Safari se muestran instrucciones manuales en vez de un botón | Safari en iPhone/iPad, app no instalada | 1. Entrar a Configuración (o al Home). 2. Tocar "Ver cómo". | En vez de un botón "Instalar" (que no funcionaría, iOS no dispara `beforeinstallprompt`), se ve el paso a paso: "Compartir" → "Agregar a pantalla de inicio" → "Agregar". | Funcional | Alta |
| CP-5.5.3 | La app ya instalada no muestra ningún control de instalación | La app corre en modo `standalone` (ya instalada) | 1. Entrar a Configuración. 2. Entrar al Home. | Ni Configuración ni el Home muestran el banner o control de instalación en ninguno de los dos lugares. | Negativo | Media |
| CP-5.5.4 | El control de Configuración no se puede descartar | App no instalada, entro a Configuración | 1. Buscar alguna forma de cerrar/ocultar el control de instalación en Configuración. | No existe botón de cerrar ahí (a diferencia del banner del Home) — el control permanece siempre visible mientras la app no esté instalada. | Funcional | Baja |
| CP-5.5.5 | El banner del Home se puede cerrar y no vuelve a aparecer en la misma sesión del navegador | App no instalada, banner visible en el Home | 1. Tocar "✕" en el banner. 2. Navegar a otra pantalla y volver al Home (misma pestaña/sesión de navegador). | El banner no vuelve a aparecer en esa sesión. | Funcional | Media |
| CP-5.5.6 | El banner del Home vuelve a aparecer en una sesión nueva del navegador | Descarté el banner en una sesión anterior; abro una sesión nueva (o `sessionStorage` limpio) | 1. Abrir la app en una pestaña/sesión nueva del navegador, sin instalar la app todavía. | El banner del Home vuelve a mostrarse (el descarte es por sesión, no permanente). | Límite | Baja |

## Transversal (aplica a toda la épica)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-5.3.1 | Menú con ítems bloqueados se ve y funciona bien en mobile y desktop | — | 1. Repetir la revisión del menú y sus badges desde un navegador de escritorio y desde un viewport móvil. | El menú es usable y legible en ambos casos, sin que los badges se corten o superpongan. | Responsive | Baja |

## Candidatos a automatización temprana (referencia para el chat "Automatización")

- CP-5.2.1 y CP-5.2.2 son excelentes candidatos de Postman y, además, buenos tests de "red de seguridad" (regression): conviene automatizarlos apenas exista la primera funcionalidad de fase futura en desarrollo, para que cualquier cambio futuro que accidentalmente exponga una ruta bloqueada se detecte de inmediato.
- CP-5.1.2 es un candidato razonable de Playwright una vez que exista el menú real, como smoke test rápido de UI.

## Resultado de la ejecución manual (2026-09-06)

- CP-5.1.1 ✅ Pasa — sección "Se viene" en el Home con 4 ítems y badge "Próximamente" visible en cada uno.
- CP-5.1.2 ✅ Pasa — tocar un ítem muestra el mensaje "todavía está en desarrollo" sin navegar a ninguna pantalla.
- CP-5.1.3 ✅ Pasa — diferencia visual clara (ítems activos son botones sólidos con color de acento; los bloqueados tienen borde punteado, opacidad reducida y el badge).
- CP-5.2.1 ✅ Pasa — una URL manipulada a mano (`/reservas`, sin ruta real) devuelve el 404 estándar de Next.js, sin pantalla rota ni datos parciales.
- CP-5.2.2 ⚪ No aplica todavía — ninguna de las 4 funcionalidades de "Se viene" tiene endpoint real en desarrollo activo (a diferencia del ejemplo de la historia, "ruta implementada pero no liberada"); se reevalúa cuando exista una.
- CP-5.2.3 ✅ Pasa (por descarte de CP-5.2.1) — el 404 de Next.js no expone ningún detalle interno.
- CP-5.4.1 ✅ Pasa — verificado en el navegador con una cuenta con datos reales (ranking, partido jugado, racha, próximo partido).
- CP-5.4.2 ✅ Pasa — verificado con cuenta nueva sin partidos: "No tenés partidos próximos", "Todavía no jugaste ningún partido hasta el final", 0/0%.
- CP-5.4.3 ✅ Pasa — sin invitaciones pendientes, el cartel no aparece.
- CP-5.4.4 ⚪ No re-ejecutado en esta ronda (ya confirmado como correcto durante la construcción de US-5.3 en una sesión anterior).

**Sin bugs nuevos encontrados en esta ronda.**

## Nota de cierre — MVP completo

Con esta matriz se completa la cobertura de casos de prueba manuales de las 5 épicas del MVP. Entre esta pasada (2026-09-06) y las anteriores, se ejecutaron los casos formales de US-2.1 a US-2.6, US-3.1 a US-3.5, US-4.1 a US-4.3 y US-5.1 a US-5.3 (US-2.7/2.8/2.9 y US-1.x quedan en ejecución de humo/anterior, ver notas de cada matriz). Se encontraron y corrigieron **5 bugs nuevos** en esta ronda (BUG-008 a BUG-012, incluido BUG-009 crítico de escalada de privilegios) — el resto de Postman formal queda para el cierre general del proyecto, por decisión del usuario.
