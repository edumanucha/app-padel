# Clases de Playwright — aprender a crear pruebas automáticas

> Curso armado el 2026-10-04 para el Bloque 3 de `roadmap-aprendizaje-qa-automation.md`. La idea: Eduardo aprende a escribir las pruebas; Claude hace de profe (explica, corrige, no deja el código hecho). Todas las pruebas se hacen sobre Padelito.

## Cómo se da cada clase

1. **Idea** (5 minutos de lectura): qué se aprende y para qué sirve.
2. **Ejemplo**: Claude lo muestra con Padelito, comentado línea por línea.
3. **Ejercicio**: lo escribe Eduardo, solo.
4. **Corrección**: se corre la prueba; Claude revisa y explica qué mejorar.
5. **Apunte**: al final de cada clase se anota qué se aprendió, en la sección "Mi cuaderno" de este archivo.

## Decisiones de partida (a confirmar al empezar)

- Lenguaje: **JavaScript** (la app ya está en JS).
- Primero contra la app **publicada en Vercel** (no hace falta levantar nada); después, contra local.
- Las pruebas viven en una carpeta aparte (`app/e2e/`), con su propio `package.json`, para no mezclarlas con la app.
- Nunca se guardan contraseñas ni claves en el repo: van en variables de entorno / archivo `.env` ignorado por git.

---

## Clase 1 — Qué es una prueba automática y la primera corrida

**Se aprende:** qué hace Playwright (maneja un navegador real por código), cuándo conviene automatizar y cuándo no (pirámide de testing), instalar Playwright y correr la primera prueba.

**Ejemplo:** abrir Padelito y verificar que el título de la página tiene "Padelito".

**Ejercicio:** correr la prueba de ejemplo, romperla a propósito (cambiar el texto esperado) y leer el error.

**Conceptos clave:** `test`, `page`, `goto`, `expect`, `npx playwright test`, el informe HTML.

## Clase 2 — Localizar elementos

**Se aprende:** cómo le decís a la prueba "tocá ESTE botón". Orden de preferencia de los localizadores: `getByRole` → `getByLabel` → `getByText` → `getByTestId` → CSS (último recurso).

**Ejemplo:** encontrar el botón "Cargar un partido" y el título de la pantalla de inicio.

**Ejercicio:** localizar 5 elementos de la pantalla "Cómo funciona" sin usar CSS. Usar `npx playwright codegen` para ver qué sugiere y compararlo con lo que escribiste.

**Conceptos clave:** por qué un selector frágil rompe la prueba cuando cambia el diseño; accesibilidad y pruebas se ayudan entre sí.

## Clase 3 — Acciones y verificaciones

**Se aprende:** `click`, `fill`, `check`, `selectOption`; las verificaciones (`toBeVisible`, `toHaveText`, `toHaveURL`, `toHaveCount`); y la **espera automática** (por qué casi nunca se usa `waitForTimeout`).

**Ejemplo:** recorrer el menú inferior y verificar a qué URL va cada pestaña.

**Ejercicio:** una prueba que entre a `/consejos` y verifique que hay al menos 3 consejos visibles.

**Conceptos clave:** auto-waiting, pruebas "flaky" (que a veces fallan sin motivo) y cómo evitarlas.

## Clase 4 — Prueba del modo visitante

**Se aprende:** estructura de una prueba (preparar, actuar, verificar), `test.describe`, `beforeEach`, y cómo probar un comportamiento "negativo" (algo que NO debe pasar).

**Escenarios:**
- Sin sesión, el Inicio se ve (`HomeVisitante`).
- Sin sesión, `/perfil` muestra el aviso y el botón para crear cuenta, no los datos.
- Sin sesión, las pantallas públicas (`/consejos`, `/como-funciona`) se ven normales.

**Ejercicio:** escribir los tres escenarios. Esta es la primera prueba real del proyecto.

## Clase 5 — Login con una cuenta de prueba

**Se aprende:** autenticarse una sola vez y reutilizar la sesión (`storageState`), proyectos de configuración (`setup`), variables de entorno para credenciales.

**Importante:** se usa una cuenta de prueba creada solo para esto. Las credenciales NO van al repo. Recordatorio de seguridad del proyecto: no se crean cuentas ni se ingresan contraseñas en la app real desde automatismos de Claude; la cuenta de prueba la crea Eduardo.

**Ejercicio:** prueba que entra con la cuenta de prueba y verifica que "Mi perfil" muestra el nombre.

## Clase 6 — Prueba de "Cargar un partido a mano"

**Se aprende:** flujos largos con formularios, datos de prueba, verificar en varias pantallas, y probar reglas de negocio (el límite de **un partido cargado a mano por día**, SQL 074).

**Escenarios:**
- Cargar un partido válido → aparece en "Mis partidos".
- Resultado inválido (empate en un set, sin ganador de 2 sets) → mensaje de error.
- Segundo partido el mismo día → aviso "Hoy ya cargaste un partido a mano".

**Ejercicio:** los tres escenarios. Pensar la limpieza: cada corrida deja datos, ¿cómo se evita que el límite diario rompa la segunda corrida?

## Clase 7 — Organizar el proyecto: Page Objects y fixtures

**Se aprende:** Page Object Model (una clase por pantalla con sus localizadores y acciones), fixtures propias, datos de prueba separados, nombres claros.

**Lección heredada (2026-09-05):** las pestañas de un mismo navegador comparten `localStorage`, y por eso la sesión. Para probar con **dos usuarios a la vez** (por ejemplo, el anotador único y quien solo mira el Marcadorcito) hay que usar un `browser.newContext()` por usuario.

**Ejercicio:** pasar las pruebas de las clases 4 a 6 a Page Objects. Después, una prueba con dos contextos: un usuario cede el control del Marcadorcito y el otro lo recibe.

## Clase 8 — Informes, depuración y correr solas en CI

**Se aprende:** el Trace Viewer (grabación paso a paso de una corrida fallida), capturas y videos, `--debug`, `--ui`, y GitHub Actions para correr las pruebas con cada cambio.

**Ejercicio:** hacer fallar una prueba a propósito, abrir el trace y explicar qué pasó. Armar el workflow de GitHub Actions y ver el informe en la pestaña Actions.

**Cierre:** marcar en `casos-prueba-epicaX-*.md` los casos que quedaron automatizados y anotarlo en `automatizacion-estado.md`.

---

## Mi cuaderno

(Se completa clase por clase: qué entendí, qué me trabó, ejemplo que escribí yo.)

- Clase 1:
- Clase 2:
- Clase 3:
- Clase 4:
- Clase 5:
- Clase 6:
- Clase 7:
- Clase 8:
