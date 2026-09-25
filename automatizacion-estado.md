# Automatización — decisiones y estado

> Chat #4 del Proyecto ("Automatización"): automatiza pruebas con Postman (API) y Playwright (E2E, con Page Object Model) sobre la app real, a medida que las funcionalidades vayan estando listas en "Crear la app".

**Última actualización:** 2026-09-05

## Estado

🟡 **Primeros pasos reales con Postman.** El usuario armó a mano en Postman (versión de escritorio) una colección `app padel` con los primeros 3 requests reales (signup de un usuario de prueba, completar perfil, leer `partido_jugadores`) para reproducir y reverificar BUG-004/005/006 de la Épica 2. Todavía sin estructura de carpetas ni convención formal (ver pendientes) — arrancó como prueba manual puntual, no como suite organizada. Playwright/E2E sigue sin arrancar.

## Decisiones ya tomadas

- Postman para pruebas de API (colecciones organizadas por épica/feature, ver Bloque 2 de `roadmap-aprendizaje-qa-automation.md`).
- Playwright para pruebas E2E, con Page Object Model (POM) para mantenibilidad (ver Bloque 3 del mismo roadmap).
- No se automatiza todo: se prioriza la pirámide de testing — más cobertura de API, E2E solo en flujos críticos.
- Cuando se automatice un caso de `casos-prueba-epicaX-*.md`, hay que marcarlo ahí (no duplicar esa información acá).
- Convención de nombres de requests en Postman: `<Recurso> - <Acción>` (el método ya se ve como tag de color, no hace falta repetirlo en el nombre).

## Lección aprendida (2026-09-05): pestañas de un mismo navegador NO son sesiones aisladas

Al simular "dos usuarios" abriendo dos pestañas del navegador contra `localhost:3000`, ambas pestañas terminaron compartiendo la misma sesión sin que se notara al principio — porque el token de sesión de Supabase se guarda en `localStorage`, que es **por origen, no por pestaña**. Loguearse en la pestaña 2 pisó silenciosamente la sesión de la pestaña 1.

**Por qué importa para Playwright:** cuando se automatice E2E con múltiples usuarios simultáneos, no alcanza con abrir varias páginas/pestañas en el mismo `BrowserContext` — hay que crear un `browser.newContext()` separado por usuario (o usar ventanas de incógnito al probar a mano), porque cada contexto tiene su propio `localStorage` aislado. Anotarlo ahora para no repetir la confusión cuando se escriban los tests reales.

## Próximo hito acordado (2026-09-05)

Al terminar de construir toda la Épica 2 (US-2.1 a US-2.6), sumar a la colección de Postman `app padel` los requests de API que cubran los endpoints de `partidos`/`partido_jugadores` — mismo estilo que los 3 primeros requests armados hoy (signup, completar perfil, y los casos que reprodujeron BUG-004/005/006). No reemplaza el testing manual de `casos-prueba-epica2-partidos.md`, es un complemento a nivel API.

## Pendiente de definir (cuando se retome)

- Estructura de carpetas para las colecciones de Postman y los tests de Playwright (ver nota de nomenclatura arriba, ya arrancada de hecho).
- Entorno de ejecución (local vs. CI con GitHub Actions) y en qué momento se suma CI.
- Manejo de datos de test (fixtures, usuarios de prueba, limpieza entre corridas) — ver además la lección de `localStorage` de arriba para el diseño de fixtures multiusuario.

## Próximo paso

Arrancar en paralelo con la parte teórica (Bloque 2 de Postman) sin depender de que haya código, y sumar la práctica real apenas `estado-tecnico-proyecto.md` refleje la primera funcionalidad implementada.
