# Estado técnico del proyecto — App Padel

> **Qué es este documento:** el "puente" de contexto técnico entre los distintos chats del Proyecto (Crear la app, Diseño QA, Automatización, Aprender conceptos, Web de presentación). Se actualiza desde el chat "Crear la app" cada vez que se cierra una entrega funcional. Los demás chats pueden leerlo para saber sobre qué versión real de la app están trabajando, sin necesidad de que se les reexplique todo desde cero.

**Última actualización:** 2026-09-12 — **Pasada de consistencia visual/UX en toda la app (sin funcionalidad nueva de backend).** *Nota honesta: este documento no se venía actualizando desde el 2026-09-05 pese a que en el medio se construyeron y probaron las 10 épicas completas del proyecto (ver la Bitácora de `tablero-proyecto.md`, que sí se mantuvo al día) — no se reconstruye acá esa historia faltante, solo se deja constancia de esta sesión, verificada contra el código real:*
- **Rediseño visual completo:** de bordes gruesos + sombra 3D dura + emoji a tarjetas claras con sombra suave (queda de referencia el Home viejo en `HomeForm.backup-estilo-bordes-gruesos-2026-09-12.js`). Set nuevo de ~25 íconos de línea dibujados a mano (`src/components/Icons.js`) reemplazando emoji en Home, menú, `BottomNav` y pantallas de detalle.
- **Nueva barra de navegación inferior** (`BottomNav.js`): Home / Jugadores / Marcadorcito / Perfil, oculta en login, onboarding, completar perfil y el marcador en vivo.
- **Nueva pantalla `/configuracion`** (`ConfiguracionForm.js`): habilita el `ThemeToggle` (ya existía construido, nunca estaba enlazado desde ningún lado), suma un selector de color de acento para los botones de acción principal (variable `--accent-cta`: amarillo/verde/turquesa — no es el `--accent` global completo, solo el de las CTA) y un selector de idioma real.
- **i18n real, primer lote:** `src/i18n/translations.js` + `LocaleContext.js` — diccionario español/inglés/portugués, **sin ruteo por idioma** (no hay `/en/...`), cubre Home + `BottomNav` + Configuración únicamente; el resto de las ~40 pantallas de la app sigue en español fijo, a extender pantalla por pantalla.
- **Tipografía:** de Fredoka + Inter a una sola familia, **Archivo** (pesos 600/700/900 para títulos, 400/500/600 para cuerpo; nombres de variable CSS `--font-fredoka`/`--font-inter` mantenidos por compatibilidad, no por seguir usando esas fuentes).
- **Privacidad de teléfono (opt-in):** `app/backend/sql/049_telefono_opcional.sql` agrega `perfiles.mostrar_telefono` (booleano, default `false`) y lo exige — además de que el jugador esté `confirmado` — dentro de `ver_participantes_partido()`, mismo criterio de privacidad ya usado para el opt-in de WhatsApp (`mostrar_whatsapp`, 2026-09-06). ⚠️ **Sin confirmar que se haya corrido contra el proyecto real de Supabase:** no está reflejada en `schema-completo.sql` (que sigue fechado 2026-09-07, antes de esta migración) ni hay ninguna nota de haberse corrido — no dar por activa esta regla en producción hasta confirmarlo.
- **Home:** el tip de pádel fijo que se escribía a mano se reemplazó por uno real vía `/api/tip-padel` (RSS público del blog Padelstar, cacheado 1h server-side, muestra título real + link "Leer más" — no se reproduce el cuerpo del artículo, por derechos de autor).
- **Marcadorcito:** "Cambiar saque" pasó de estar escondido dentro de "⚙️ Opciones" a siempre visible en el header junto al timer; loaders de las pantallas con estado de carga centrados verticalmente (antes quedaban pegados arriba); botones "Volver" auditados en ~21 pantallas (arriba a la derecha del `<h1>`, estilo botón claro).
- **Bug corregido en el login de prueba:** `LoginPruebaForm.js` derivaba la contraseña del apellido tal cual se tipeaba (case-sensitive) — reingresar con la misma cuenta pero distinta capitalización fallaba en silencio y caía a un `signUp` roto sobre un email ya existente. Normalizado a minúsculas + mensaje de error más claro para el caso de contraseña realmente incorrecta.
- **Hover global de botones:** la sombra 3D dura desplazada (estética "cartel" vieja) se reemplazó por una sombra suave en `globals.css`.
- ⚠️ **Verificado contra el código, no asumido de la descripción de la sesión:** la sección "Espacio de publicidad"/cancha recomendada del Home (mock "Padel Pro Shop Mendoza") **sigue exactamente igual que antes de esta sesión** — no se quitó, pese a haberse reportado como removida. Si la intención real era sacarla, queda pendiente.
- **Explícitamente no hecho en esta sesión** (para que no se asuma lo contrario más adelante): el resto de la i18n (~40 pantallas), un flujo real de "iniciar sesión con cualquier email" para cuentas no de prueba, una auditoría de performance, y spinners específicos para Basquelito/Futbolito.

**Actualización anterior:** 2026-09-05 — **US-2.3 ("Invitar jugadores a un partido") construida y verificada de punta a punta.** Se resolvió un problema de fondo: `perfiles` solo permite ver el propio perfil (RLS de la Épica 1), pero para buscar a otro jugador e invitarlo hacía falta poder verlo — en vez de abrir esa tabla (lo que expondría `telefono` de cualquiera antes de tiempo, adelantándose a US-2.6), se creó una función `SECURITY DEFINER` (`buscar_jugadores_para_invitar`) que devuelve solo `id` y `nombre`. Nueva pantalla `/invitaciones` (`InvitacionesForm.js`, Aceptar/Rechazar) y búsqueda embebida en `/partidos` (`InvitarJugadorForm.js`, solo visible al organizador con cupo disponible). El trigger de cupo de la Épica se extendió para correr también en `UPDATE` (aceptar invitación), no solo `INSERT` — necesario para el criterio "si el cupo se llenó mientras la invitación esperaba, rechazar la aceptación", verificado con 4 usuarios de prueba. **Decisión de metodología (a pedido del usuario):** de ahora en más toda épica cierra con una pasada de pruebas de endpoints en Postman, no solo esta.

**Actualización anterior:** 2026-09-05 — **US-2.2 ("Ver partidos abiertos y sumarme") construida y verificada de punta a punta.** Nueva pantalla `/partidos` (`ListaPartidosForm.js`): lista partidos en estado `abierto` con fecha/hora/cancha/cupo, botón "Sumarme" o "Salir" según si ya estoy anotado, y "Completo" cuando no hay lugar. Se agregó una columna `partidos.lugares_ocupados` (cuenta anotados+confirmados, distinto del campo `estado` que solo cambia con confirmados — US-2.4) y un trigger que bloquea "sumarme" sin cupo disponible (`app/backend/sql/005_us2_2_listado_y_cupo.sql`). Verificado con 2 usuarios de prueba: cupo se llena, tercer intento rechazado por la base, "Salir" libera el lugar. Lección aprendida al probar con dos pestañas del navegador: comparten `localStorage` (mismo origen), no son sesiones aisladas — documentado en `automatizacion-estado.md` de cara a los futuros tests de Playwright (necesitan `browser.newContext()` por usuario).

**Actualización anterior:** 2026-09-05 — **US-2.1 ("Crear partido") verificada de punta a punta y cerrada.** Se corrió `002_partidos.sql` y se probó en el navegador: el trigger deja al organizador anotado y confirmado solo. Al probar a fondo aparecieron 3 bugs nuevos, los 3 corregidos y reverificados el mismo día: BUG-004 (sin tope superior de jugadores — el usuario fijó el tope en 4), BUG-005 (fecha pasada no se validaba en el servidor, solo en el formulario) y BUG-006 (recursión infinita en la política RLS de `partido_jugadores`, encontrada al limpiar datos de prueba — de no corregirse iba a romper US-2.2/2.3/2.4 apenas se construyeran). Los fixes están en `003_partidos_validaciones.sql` y `004_fix_recursion_partido_jugadores.sql`. La reverificación de BUG-004/005/006 se hizo con requests directos a la API (sin pasar por el formulario) en dos entornos independientes: el navegador del asistente y **Postman**, que el usuario usó por primera vez en este proyecto (primer paso hacia la carpeta de Automatización). De paso se investigaron y guardaron 20 canchas reales de Mendoza como semilla para la futura Épica 4 (`semilla-canchas-epica4.md`), sin tocar la base todavía (no le toca el turno).

**Actualización anterior:** 2026-09-05 — **Arranca la Épica 2 (Gestión de Partidos).** Resuelta la pregunta abierta de US-2.1 (cantidad de jugadores **variable**, no fija en 4). Diseñado el esquema completo de las 6 historias de usuario (tablas `partidos` y `partido_jugadores`, con triggers `SECURITY DEFINER` para que el organizador quede auto-confirmado al crear el partido y para que el estado `completo`/`abierto` se recalcule solo según confirmaciones — ningún cliente puede forzar esos estados directamente por API, solo el organizador puede cancelar) — ver `app/backend/sql/002_partidos.sql`, **pendiente de que el usuario lo corra en el SQL Editor de Supabase** antes de poder probarlo de punta a punta. Construida (sin verificar todavía, a la espera del SQL) la primera pantalla: **"Crear partido" (US-2.1)**, en `/crear-partido`, con el mismo patrón de guard de sesión y botón deshabilitado que la Épica 1; agregado un acceso temporal a esta pantalla desde "Mi perfil" (todavía no existe una pantalla Home). Quedan pendientes US-2.2 a US-2.6 para próximas entregas.

**Actualización anterior:** 2026-09-05 — **Corregidos los 2 bugs confirmados por "Diseño QA" al ejecutar manualmente `casos-prueba-epica1-perfil.md`** (BUG-001 y BUG-003 en `registro-errores.md`): `VerPerfilForm.js` y `CompletarPerfilForm.js` ahora redirigen a `/login` (`router.replace`) cuando no hay sesión activa, en vez de mostrar una pantalla sin salida (`/perfil`) o directamente el formulario sin ningún chequeo (`/completar-perfil`, que antes no verificaba sesión hasta el envío); y `VerPerfilForm.js` suma el campo "Score de ranking" en "Mi perfil" con el placeholder fijo "Todavía no tenés valoraciones" (no hay todavía cálculo real, depende de la Épica 3). Ambos fixes reverificados en el navegador sin romper el flujo normal. Pendiente de mejora futura, no bloqueante: unificar el chequeo de sesión en un guard común (middleware o layout) en vez de repetirlo por componente. **Con esto, arranca la Épica 2 (Gestión de Partidos).**

**Actualización anterior:** 2026-09-01 — **US-1.1 (login real con Google) construida y verificada de punta a punta por el usuario.** Con esto, **las 6 historias de usuario de la Épica 1 (Autenticación y Perfil) quedan completas en código.** Además se cerraron varias mejoras transversales de UX/seguridad sobre lo ya construido (ver sección 3): rediseño de `/login`, patrón de "botón deshabilitado hasta completar el formulario", eliminación de la validación de formato del teléfono, redirección directa (sin pantallas intermedias) en login de prueba y completar perfil, reordenamiento de los botones de `/perfil`, adopción del flujo PKCE de OAuth, y una serie de ajustes visuales de hover/cursor/loader. **El usuario confirmó que todas las verificaciones pendientes quedaron OK** (DROP CONSTRAINT corrido en Supabase, teléfono sin formato guarda bien, hover/cursor final, loader visible donde correspondía, URL limpia con PKCE), y se borró `src/lib/validaciones.js` (ya sin uso) a su pedido. **Con esto, la Épica 1 queda lista para pasar a "Diseño QA" para el testing manual completo** (ver sección 8).

---

## 1. Estado general

🟢 **Backend conectado a Supabase, verificado de punta a punta.** 🟢 **Frontend con identidad visual implementada y verificada.** 🟢 **Épica 1 (Autenticación y Perfil) completa en código, probada manualmente por "Diseño QA" y con sus bugs ya corregidos:** las 6 historias de usuario (US-1.1 a US-1.6) construidas y verificadas, más 2 correcciones de esta ronda de testing (guard de sesión con redirect a `/login`, placeholder de score de ranking en "Mi perfil"). 🟡 **Épica 2 (Gestión de Partidos) en curso:** esquema de base de datos corrido en Supabase (`002` a `006_us2_3_invitar_jugadores.sql`). **US-2.1, US-2.2 y US-2.3 verificadas de punta a punta** (UI y API), con 3 bugs encontrados y corregidos en el camino (BUG-004, BUG-005, BUG-006 — ver `registro-errores.md`). Quedan US-2.4 a US-2.6 por construir (sección 8).

## 2. Decisiones pendientes de confirmar

*(ninguna sobre la Épica 2 por ahora — el SQL ya está corrido y US-2.1 verificada; el resto — el usuario confirmó el 2026-09-01 que las 5 verificaciones que estaban pendientes quedaron OK: DROP CONSTRAINT del teléfono corrido en Supabase, teléfono sin formato viejo guarda bien, hover/cursor final, loader visible donde correspondía, y URL limpia con PKCE; y decidió borrar `src/lib/validaciones.js`, ya hecho — ver sección 3)*

- **Nota menor abierta, sin acción pendiente:** durante esta ronda el usuario reportó una rayita vertical fija junto al título "Mi perfil" en `/perfil` (no relacionada con el mouse). Se investigó: no hay ningún `input`/`autoFocus`/`contentEditable` cerca en el código, y la misma pantalla (con título simple) se ve limpia en un navegador sin extensiones. Todo indica que es una extensión del Chrome del usuario (o una función de accesibilidad de Windows), no un bug de la app — mismo patrón que el falso positivo de hidratación de Bitdefender visto antes en este proyecto. El usuario decidió no seguir investigándolo ("no importa"). De paso se agregó `cursor: default` a los títulos (h1/h2/h3) en `globals.css`, para que al menos no muestren el cursor de "texto" del navegador al pasar el mouse por encima.

## 3. Decisiones técnicas ya cerradas

Del documento de alcance:
- Frontend: React / Next.js
- Backend: Node.js + Express (API REST)
- Base de datos: PostgreSQL vía **Supabase**
- Hosting frontend: Vercel
- Hosting backend: Render
- Repositorio: GitHub
- Autenticación: OAuth 2.0 con Google (vía Supabase Auth — ver ADR-001)
- Metodología: entregas pequeñas e iterativas, con testing (manual y automatizado) después de cada una, y documentación funcional/técnica/de pruebas generada a la par del desarrollo — no al final

Cerradas el 2026-08-29:
- **Entorno de trabajo:** carpeta local del usuario ya conectada. El código va en la subcarpeta `app/`.
- **Manejo de Git/GitHub — Opción A:** el usuario ejecuta `git add / commit / push` desde su propia computadora; el asistente solo edita archivos en la carpeta conectada.
- **Proveedor de base de datos: Supabase.** Ver `adr-decisiones-tecnicas.md`, ADR-001.
- **Proyecto de Supabase creado:** `app-padel`, región São Paulo, RLS automático habilitado, exposición automática de tablas deshabilitada.
- **Estructura del backend:** `app.js` (configuración de Express, exportable) separado de `index.js` (arranca a escuchar) — práctica estándar para que el código sea testeable más adelante (Playwright/Jest pueden importar `app` sin levantar un puerto real).
- **Conexión a Supabase verificada:** el usuario completó su `.env` local (nunca compartido en el chat) con `SUPABASE_URL` y `SUPABASE_ANON_KEY` (la "Publishable key" en la terminología nueva de Supabase), y el endpoint de diagnóstico `/health/supabase` confirmó autenticación exitosa contra la base de datos real.

Cerradas el 2026-08-30 (frontend):
- **Frontend scaffolded con `create-next-app`:** JavaScript (no TypeScript — coherente con el objetivo de aprender JS desde cero), Tailwind CSS v4, ESLint, App Router, código en `src/`.
- **Identidad visual del frontend definida — estilo "Friendly Rounded":** bordes muy redondeados, contorno tipo dibujo (estilo Duolingo/neubrutalismo suave), paleta cálida. Tipografía **Fredoka** solo para títulos/marca/botones/navegación, y **Inter** para texto de contenido. Con **modo claro y oscuro** y patrón responsive (barra inferior mobile / sidebar desktop). Implementada como **tokens de diseño** (variables CSS). Decidido comparando varias tandas de mockups visuales.
- **Identidad visual implementada en código y verificada:** tokens de color en `globals.css`, tipografías vía `next/font/google`, botón `ThemeToggle.js` (guarda preferencia en `localStorage`), script anti-flash con `suppressHydrationWarning`. Verificado por el usuario en su propio navegador.
- **Quirk de entorno (Windows):** la carpeta conectada tiene un `&` en el nombre, lo que rompe `npm run <script>` en Windows (usa `cmd.exe`, que interpreta el `&` como separador de comandos). Solución: `app/frontend/.npmrc` con `script-shell=powershell.exe`.

Cerradas el 2026-08-30 (diseño de datos, Épica 1):
- **Escala de "nivel de juego": categorías de pádel, 1ª a 7ª.** Importante: 1ª es la categoría **más alta** (al revés de lo intuitivo) — hay que aclararlo bien en la UI para que no confunda. Esta misma escala se va a reutilizar en la Épica 3 para las valoraciones entre jugadores.
- **Completar el perfil es obligatorio** antes de poder usar el resto de la app: después del primer login, si no existe fila en `perfiles` para ese usuario, se lo redirige a completarlo — no se puede omitir y hacerlo "después".
- **Los 7 campos del perfil son todos obligatorios, sin excepción** (nombre, teléfono, sexo, zona, nivel, mano hábil, posición) — decisión explícita del usuario que resuelve formalmente la pregunta abierta sobre la obligatoriedad de zona/teléfono que había quedado pendiente en `historias-usuario-mvp.md`. Ya estaba implementado así desde el principio (los 7 campos son `NOT NULL` en el esquema de `perfiles` y tienen `required` en `CompletarPerfilForm.js`), así que no hizo falta ningún cambio de código — solo queda formalizada la decisión.
- **Esquema de la tabla `perfiles` cerrado:**
  - `id` (uuid, referencia a `auth.users.id`, 1 a 1)
  - `nombre` (texto)
  - `telefono` (texto — ver "Eliminada la validación de formato del teléfono" más abajo, sección 2026-09-01) — se agrega en el alta aunque la regla de privacidad que lo usa (visible solo si el jugador confirmó el partido) recién se implementa en la Épica 2; así no hay que volver a tocar este formulario más adelante.
  - `sexo` (masculino/femenino, obligatorio)
  - `zona` (Ciudad de Mendoza, Godoy Cruz, Guaymallén, Las Heras, Luján de Cuyo, Maipú, Otra zona)
  - `nivel` (1 a 7, ver arriba)
  - `mano_habil` (diestro/zurdo)
  - `posicion` (drive/revés)
  - `activo` (booleano, default true) y `dado_de_baja_en` (fecha, nulo si sigue activo) — para dar de baja el perfil dejando registro (**soft delete**, ver debajo).
  - `created_at`, `updated_at`.
  - Como el perfil se crea recién cuando **todos** los campos obligatorios están completos (no antes), la existencia misma de la fila indica que el perfil está completo — no hace falta una columna extra tipo `perfil_completo`.
- **Baja de cuenta con registro, no borrado real:** el usuario puede dar de baja su propio perfil, pero eso se implementa como una actualización (`activo = false`, `dado_de_baja_en = ahora`), nunca como un `DELETE`. De hecho, los permisos (RLS) de la tabla directamente **no incluyen permiso de `DELETE`** — así, aunque alguien lo intente, la base de datos no permite borrar una fila de verdad. Esta funcionalidad quedó documentada como **US-1.6** en `historias-usuario-mvp.md` (a cargo de "Diseño QA").
- **Permisos por ahora: cada jugador ve y edita únicamente su propio perfil.** Todavía no existe forma de saber si dos jugadores "comparten un partido" (eso depende de la Épica 2), así que no se habilita ver perfiles ajenos hasta que exista esa regla real.
- **Herramienta de login de prueba (para QA, sin crear cuentas de Gmail reales):** se habilita el proveedor de **email + contraseña** en Supabase (además de Google), y se arma una pantalla donde se ingresa Nombre y Apellido; por atrás se arma un email de prueba con el nombre y se usa el apellido como contraseña (Supabase exige mínimo 6 caracteres) contra el mecanismo real de Supabase Auth — no es un login "inventado" aparte, así que también sirve para probar el flujo real de sesión y permisos.
  - ⚠️ **Nota de seguridad pendiente, a propósito, por decisión explícita del usuario:** esta pantalla se construye ahora sin necesariamente estar oculta/deshabilitada todavía — la decisión de si se gatea por variable de entorno (para que no exista ni la posibilidad de usarla en producción) o se remueve, se toma **antes de publicar la app de verdad**, no ahora. **Recordatorio para cualquier chat/sesión futura: no perder de vista este punto antes de un eventual deploy a producción.**

Cerrada el 2026-08-30 (infraestructura, Épica 1):
- **Tabla `perfiles` creada en Supabase**, vía SQL corrido manualmente por el usuario en el SQL Editor (Success, sin errores): incluye todas las columnas y `check constraints` del esquema de arriba, un trigger que actualiza `updated_at` solo en cada modificación, RLS habilitado, y las 3 políticas (SELECT/INSERT/UPDATE, "solo mi propio perfil") sin política de DELETE.
- **Proveedor de email + contraseña habilitado en Supabase** (Authentication → Sign In / Providers → Email). Ya venía activado por defecto en este proyecto. Además se **desactivó la opción "Confirm email"**: por defecto Supabase exige que el usuario confirme su email con un link antes de poder iniciar sesión, pero el login de prueba genera emails falsos (a partir del nombre) que nunca podrían recibir ni abrir ese link — desactivarlo es necesario para que el login de prueba funcione.

Cerrada el 2026-08-30 (código, Épica 1):
- **Paquete `@supabase/supabase-js` instalado en el frontend**, y creado `src/lib/supabaseClient.js`: cliente de Supabase para usar del lado del navegador, que lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` desde `app/frontend/.env.local` (plantilla en `.env.local.example`, `.env.local` real nunca compartido en el chat, ya ignorado por `.gitignore`).
- **Pantalla de login de prueba construida** (ruta `/login`, componente `src/components/LoginPruebaForm.js`): formulario de Nombre + Apellido que valida que el apellido tenga al menos 6 caracteres (mínimo de contraseña que exige Supabase), intenta `signInWithPassword` primero (usuario ya existente) y, si falla, intenta `signUp` (lo crea de cero). **Verificado por el usuario:** creó un usuario de prueba nuevo y quedó logueado correctamente, viendo el email generado.
  - Pendiente de confirmar con un test manual explícito: el camino de "usuario ya existente" (`signInWithPassword` exitoso en un segundo intento, con los mismos datos, después de cerrar sesión) — se verificó la creación (alta), pero no se confirmó todavía el reingreso.
  - ⚠️ **Advertencia de diseño detectada durante la prueba, importante para "Diseño QA" al armar casos con varios usuarios de prueba:** el email se arma **solo a partir del Nombre** (no del apellido). Esto significa que dos "personas de prueba" necesitan usar un **Nombre distinto entre sí** — no alcanza con que difieran solo en el apellido. Si dos usan el mismo Nombre y el mismo Apellido, entran a la **misma cuenta** (no son dos usuarios de prueba separados, aunque cada uno tenga su propia sesión de navegador). Y si usan el mismo Nombre con un Apellido distinto, el login falla (la contraseña quedó fijada por el primer registro con ese nombre). Recomendación: usar nombres de prueba claramente distintos por persona (ej. "JuanTest1", "JuanTest2").
- **"Completar perfil" construido** (ruta `/completar-perfil`, componente `src/components/CompletarPerfilForm.js`, US-1.2): formulario con los 7 campos de `perfiles` (nombre, teléfono, sexo, zona, nivel, mano hábil, posición), todos obligatorios; el selector de nivel muestra "1ª (máxima)" y "7ª (mínima)" para no confundir por la escala invertida. Al enviarlo, toma el usuario logueado (`supabase.auth.getUser()`) e inserta la fila en `perfiles` con ese `id`. Si el usuario ya tenía perfil, detecta el error de fila duplicada (código `23505`) y avisa en vez de fallar feo. **Verificado por el usuario:** completó el formulario y la fila apareció en la tabla.
  - ⚠️ **Gotcha de Supabase descubierto al probar esto, importante para cualquier tabla nueva que se cree por SQL directo (no por la interfaz de Supabase):** Row Level Security (RLS) controla qué FILAS puede tocar un rol, pero antes de eso Postgres exige un permiso de tabla más básico (`GRANT`) para ese rol — si no existe, da "permission denied for table X" aunque las políticas de RLS estén bien. Como `perfiles` se creó por SQL directo, hubo que correr manualmente: `GRANT SELECT, INSERT, UPDATE ON public.perfiles TO authenticated;` (sin DELETE, a propósito). **Recordatorio para cualquier tabla nueva de las próximas épicas:** sumar este `GRANT` al script SQL de creación de la tabla desde el principio, para no repetir este mismo bloqueo.
- **"Ver mi perfil" construido** (ruta `/perfil`, componente nuevo `src/components/VerPerfilForm.js`, US-1.3): trae la fila de `perfiles` del usuario logueado (`SELECT` filtrado por `id`, protegido además por la política RLS "Ver mi propio perfil") y la muestra en modo solo lectura, con las mismas etiquetas legibles que "completar perfil" (ej. `zona: "godoy_cruz"` se muestra como "Godoy Cruz"). Si no existe fila (no debería pasar, el perfil es obligatorio) redirige a `/completar-perfil` en vez de mostrar una pantalla rota. Se optó por un **componente nuevo separado** en vez de refactorizar `CompletarPerfilForm.js` para que sirva en los dos modos (crear/editar) — decisión explícita del usuario: menos riesgo de romper código ya probado, con algo de duplicación aceptada por ahora; refactorizar más adelante si el patrón se repite. **Verificado por el usuario:** vio correctamente los 7 datos de su perfil ya cargado.
- **Modo edición agregado a "ver mi perfil" (US-1.4, la parte que no depende de partidos):** un botón "Editar" en `VerPerfilForm.js` pasa la misma pantalla a un formulario con los 7 campos prellenados con los valores actuales, y al guardar hace un `UPDATE` sobre la fila existente (a diferencia de "completar perfil", que hace `INSERT` porque la fila todavía no existe). **Verificado por el usuario:** editó un dato y confirmó que se guardó correctamente.
- **"Cerrar sesión" construido (US-1.5, versión definitiva):** botón nuevo en `VerPerfilForm.js` (modo lectura), junto al de "Editar". Llama a `supabase.auth.signOut()` (corta la sesión real) y redirige a `/login`. **Verificado por el usuario:** confirmó que el botón corta la sesión correctamente.
- **"Dar de baja mi cuenta" (US-1.6) — paso 1 construido y verificado:** botón "Dar de baja mi cuenta" en `VerPerfilForm.js`, con cuadro de confirmación propio; si se confirma, hace `UPDATE` (`activo = false`, `dado_de_baja_en = ahora()`), cierra la sesión y redirige a `/login`. **Verificado por el usuario.**
- **"Dar de baja mi cuenta" (US-1.6) — paso 2 (reactivación) construido y verificado:** si `activo === false` al loguearse, se muestra una pantalla propia con "Reactivar mi cuenta" o "Cancelar" (cierra sesión sin reactivar). **Verificado por el usuario.** Con esto, **US-1.6 queda completa**.

Cerradas el 2026-08-30 (decisiones de diseño, US-1.6 — Dar de baja mi cuenta):
- **Reactivación de una cuenta dada de baja: requiere confirmación explícita.** No se reactiva sola al loguearse — se muestra una pantalla propia preguntando, y recién si confirma se pone `activo = true` (y se limpia `dado_de_baja_en`).
- **Confirmación antes de dar de baja: solo un cuadro de confirmación explícito**, sin pedir reingresar la contraseña — es una acción reversible, no amerita esa fricción extra.
- **Quedan 2 de las 4 preguntas abiertas de US-1.6 todavía sin resolver, a propósito:** visibilidad del nombre en partidos pasados, y qué pasa con partidos futuros donde el usuario dado de baja participa u organiza. Dependen de la Épica 2 (todavía no construida).

Cerradas el 2026-09-01 (US-1.1 — login real con Google, cierre de la Épica 1 en código):
- **Google Cloud Console configurado:** pantalla de consentimiento OAuth tipo "Usuarios externos" (con el usuario de prueba real agregado al allowlist mientras la app está en modo "Prueba"), y un OAuth Client ID de tipo "Aplicación web" con el origen JavaScript autorizado `http://localhost:3000` y el redirect URI autorizado apuntando al callback de Supabase.
- **Proveedor de Google habilitado del lado correcto de Supabase:** en **Authentication → Sign In / Providers → Google** (no en "OAuth Apps"/"OAuth Server", que es la sección para configurar Supabase como proveedor de terceros — la dirección opuesta a lo que necesitábamos). Se cargó ahí el Client ID y el Client Secret generados en Google Cloud Console (nunca compartidos en el chat).
- **Botón "Iniciar sesión con Google" construido** en `LoginGoogleForm.js`, llamando a `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: \`${window.location.origin}/perfil\` } })`. **Verificado por el usuario de punta a punta:** el login redirige a Google, vuelve, y deja al usuario logueado en `/perfil` con sesión real. **Con esto, las 6 historias de usuario de la Épica 1 quedan completas en código.**
- **Rediseño de `/login` (decisión de UX del usuario):** no quería que el botón de Google y el login de prueba se vean como opciones jerárquicamente distintas ("uno grande de Gmail, el otro separado"). Se mostraron 3 opciones de mockup visual y el usuario eligió la primera: una sola tarjeta compartida, con el botón de Google arriba (ancho completo, ícono, mismo estilo que cualquier otro botón) y el login de prueba colapsado debajo (un botón chico "Entrar con usuario de prueba" que expande el formulario Nombre+Apellido en el lugar, sin navegar a otra pantalla ni abrir un modal). Implementado con un componente nuevo `LoginForm.js` que pasó a ser el dueño de la tarjeta visual compartida; `LoginGoogleForm.js` y `LoginPruebaForm.js` dejaron de dibujar cada uno su propia tarjeta, ahora solo aportan su contenido interno.
- **Patrón "botón deshabilitado hasta completar el formulario" aplicado a todos los formularios de la app** (a pedido del usuario, como práctica general, no solo para este formulario): en `LoginPruebaForm.js`, `CompletarPerfilForm.js` y `VerPerfilForm.js` (modo edición), el botón de enviar/guardar queda `disabled` mientras no estén completos todos los campos obligatorios. Se implementó con una variable booleana derivada, calculada de nuevo en cada render a partir de los valores actuales de los campos (sin `useEffect` ni estado adicional) — más simple y con menos superficie para bugs de sincronización que mantener un estado aparte para "¿está completo?".
- **Eliminada la validación de formato del teléfono** (decisión del usuario: "le suma una dificultad innecesaria"). El teléfono sigue siendo obligatorio (no puede quedar vacío), pero ya no se exige ningún formato específico. Se sacó en las dos capas donde estaba implementada:
  - **Frontend:** removidas las llamadas a `telefonoValido`/`mensajeErrorTelefono`, el placeholder de ejemplo y el texto de ayuda bajo el campo, en `CompletarPerfilForm.js` y `VerPerfilForm.js`.
  - **Base de datos:** el usuario confirmó haber corrido `ALTER TABLE public.perfiles DROP CONSTRAINT telefono_formato_valido;` en el SQL Editor de Supabase.
  - `src/lib/validaciones.js` (donde vivían esas funciones) quedó sin uso y **se borró** a pedido explícito del usuario (verificado antes de borrar que ningún componente lo importaba).
- **Corregidas dos inconsistencias de UX:** tanto el login de prueba como "completar perfil" ahora redirigen directamente a `/perfil` (`router.push`) apenas termina la operación, en vez de mostrar una pantalla intermedia propia ("sesión iniciada" / "¡Perfil completado!") — así los 3 caminos de entrada (Google, login de prueba, completar perfil) se comportan igual.
- **Corregido el alineado de los botones de `/perfil`** (Editar / Cerrar sesión / Dar de baja mi cuenta): el usuario reportó que se veía "raro" (quedaba espacio vacío a la derecha del botón de baja, que es más angosto y estaba solo en su fila). Se mostraron 4 mockups de opciones de alineado; se eligió la que pone Editar y Cerrar sesión en una grilla de 2 columnas iguales (50/50), con "Dar de baja mi cuenta" ocupando todo el ancho en su propia fila debajo — sin espacio muerto.
- **Adoptado el flujo PKCE de Supabase Auth para el login** (decisión del usuario, tras preguntar por el `#access_token=...` visible en la URL después de loguearse con Google). Investigado en la documentación oficial de Supabase: el flujo implícito (el que se usaba, y sigue siendo válido) devuelve el token en el fragmento de la URL (`#...`) — los fragmentos nunca se envían a ningún servidor por diseño del navegador, así que no es una fuga real hacia logs de servidor, y `supabase-js` lo limpia solo de la URL visible. Aun así, el usuario prefirió evitar que se vea del todo: se agregó `flowType: "pkce"` a la configuración de `createClient` en `src/lib/supabaseClient.js`, con lo cual ahora se recibe un `?code=...` de un solo uso que la propia librería intercambia automáticamente por la sesión, sin exponer nunca un token en la URL.
- **Evaluada y descartada (por ahora) la idea de un login por ventana emergente** (popup que se abre y se cierra solo, en vez de redirigir la página completa a Google y volver). Investigado: Supabase no tiene soporte nativo para esto — requeriría una implementación manual con `skipBrowserRedirect` + comunicación entre ventanas vía `BroadcastChannel`, y sigue siendo un pedido de feature no resuelto en la comunidad de Supabase (GitHub discussion supabase/discussions/4487). El usuario confirmó ("de acuerdo") mantener el flujo actual de redirección de página completa, que es además el default recomendado por Supabase.
- **Serie de ajustes visuales de hover/cursor/loader sobre la identidad "Friendly Rounded" (varias rondas de mockups, con reversiones incluidas):**
  - Se agregó un **loader de "pelota de pádel picando"** (componente nuevo `PelotaLoader.js`, animación CSS pura vía `@keyframes`) para reemplazar el texto plano "Cargando..." — aplicado a los 6 botones que ya tenían un estado de carga, y a la carga inicial de `/perfil`. **Esta fue la única de las 3 ideas visuales de esta ronda que se mantuvo sin reversiones.**
  - Se probó un **cursor personalizado con forma de paleta de pádel** (SVG como data URI) — en el primer intento no aparecía por un bug de codificación (`data:image/svg+xml;utf8,...` no es un formato de MIME-parameter estándar y varios navegadores lo descartan en silencio); se corrigió regenerándolo en base64. Y se probó un efecto hover de "se levanta y brilla" al pasar el mouse por cualquier botón.
  - **El usuario terminó rechazando ambas ideas** ("no me gusta" el efecto de brillo; después de ver la paleta funcionando, igual pidió sacarla: "volvé el mouse original"). Se le mostraron luego 5 patrones de hover reales usados en sitios web (oscurecer/aclarar, escala sutil, "se hunde", anillo/glow de foco, relleno deslizante); el usuario eligió el de **anillo/glow de foco** como reemplazo definitivo.
  - **Estado final aplicado globalmente en `globals.css`** (sin tocar cada componente por separado, aprovechando que todos los botones ya comparten clases de Tailwind como `bg-accent`/`bg-red-600`): cursor del sistema por defecto (sin cursor personalizado), y al pasar el mouse por cualquier botón habilitado aparece un halo de color (`box-shadow` con `color-mix(in srgb, var(--accent) 55%, transparent)`, o la variante con `--ink` para los botones que ya usan `--accent` o rojo como fondo).

Cerradas el 2026-09-05 (bugs de la Épica 1, ver `registro-errores.md`):
- **BUG-001 corregido:** `VerPerfilForm.js` y `CompletarPerfilForm.js` ahora redirigen a `/login` (`router.replace`) si no hay sesión activa al entrar a la pantalla, en vez de mostrar un mensaje sin salida o (en el caso de completar perfil) el formulario sin ningún chequeo de sesión hasta el envío.
- **BUG-003 corregido:** agregado el campo "Score de ranking" en `VerPerfilForm.js`, con el placeholder fijo "Todavía no tenés valoraciones" hasta que exista el cálculo real (Épica 3).

Cerradas el 2026-09-05 (arranque de la Épica 2 — Gestión de Partidos):
- **Cantidad de jugadores: variable, no fija en 4.** El organizador la especifica al crear el partido (campo numérico, mínimo 2) — resuelve la pregunta abierta de US-2.1. Permite usar la misma tabla para singles, dobles o formatos con más jugadores sin modelar un tipo de partido aparte.
- **Esquema de datos diseñado completo para las 6 historias de usuario** (aunque el código todavía solo cubre US-2.1) — ver `app/backend/sql/002_partidos.sql`, primer script SQL de este proyecto que queda guardado en el repo (el de `perfiles` se corrió antes de adoptar esta carpeta y no quedó guardado):
  - Tabla `partidos`: organizador, fecha/hora, cancha (texto libre — la Épica 4 todavía no existe), cantidad de jugadores, estado (`abierto`/`completo`/`cancelado`/`jugado`).
  - Tabla `partido_jugadores`: quién participa en cada partido y con qué estado (`invitado`/`anotado`/`confirmado`/`rechazado`); `UNIQUE(partido_id, jugador_id)` evita sumarse dos veces al mismo partido.
  - **Decisión de diseño clave:** el cliente nunca escribe directamente los estados "completo"/"jugado" de un partido. Un trigger `SECURITY DEFINER` (`agregar_organizador_como_confirmado`) anota y confirma automáticamente al organizador al crear el partido; otro (`recalcular_estado_partido`) recalcula `abierto`↔`completo` cada vez que cambia una fila de `partido_jugadores`, contando confirmados contra `cantidad_jugadores`. La única transición que un cliente puede hacer directamente por RLS sobre `partidos` es que el organizador la cancele. La transición a "jugado" (fecha ya pasada) se resuelve con una función `marcar_partidos_jugados()` que el frontend llama al cargar listados/detalles (no hay infraestructura de cron en este proyecto, así que se recalcula perezosamente en cada lectura).
  - "Salir de un partido" y "rechazar una invitación" se implementan como `DELETE` de la propia fila en `partido_jugadores` (libera el lugar); "aceptar invitación" y "confirmar asistencia" como `UPDATE` de la propia fila.
- **Construida (sin verificar todavía) la primera pantalla: "Crear partido" (US-2.1)** — ruta `/crear-partido`, componente `CrearPartidoForm.js`: fecha/hora, cancha, cantidad de jugadores; mismo patrón de guard de sesión (redirect a `/login`) y botón deshabilitado hasta completar el formulario que ya se usa en la Épica 1; rechaza fecha/hora en el pasado. Al guardar muestra un resumen simple del partido creado (no hay pantalla de detalle de partido todavía, eso es US-2.5). Agregado un botón "Crear partido" en `VerPerfilForm.js` como acceso temporal (no existe una pantalla Home todavía).
  - ⚠️ **Bloqueado hasta que el usuario corra `app/backend/sql/002_partidos.sql`** en el SQL Editor de Supabase — sin eso, el `insert` a `partidos` falla.

## 4. Arquitectura actual

```
app/
├── .gitignore              # node_modules, .env, builds -- nunca se suben a git
├── backend/
│   ├── package.json
│   ├── .env.example         # plantilla de variables de entorno
│   ├── .env                 # (local, no versionado) credenciales reales de Supabase
│   ├── sql/
│   │   └── 002_partidos.sql    # Épica 2: tablas partidos/partido_jugadores, RLS y triggers (correr manual en Supabase)
│   └── src/
│       ├── app.js              # configuración de Express + rutas (incluye /health y /health/supabase)
│       ├── index.js            # arranca el servidor (app.listen)
│       └── supabaseClient.js   # inicializa el cliente de Supabase a partir del .env
└── frontend/                # Next.js (JavaScript, App Router, Tailwind CSS v4)
    ├── .npmrc                  # fuerza PowerShell como shell de npm (evita el bug del "&" en Windows)
    ├── .env.local.example      # plantilla de variables de entorno del frontend
    ├── .env.local              # (local, no versionado) credenciales reales de Supabase
    ├── package.json
    ├── next.config.mjs
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    ├── jsconfig.json
    ├── public/
    └── src/
        ├── app/
        │   ├── layout.js        # carga Fredoka + Inter; script anti-flash de tema; suppressHydrationWarning
        │   ├── page.js          # pantalla de prueba de la identidad visual (todavía no es una feature real)
        │   ├── globals.css      # tokens de diseño (colores claro/oscuro) + interacción de botones (hover anillo/glow) + animación del loader de pelota
        │   ├── login/
        │   │   └── page.js      # ruta /login -- renderiza <LoginForm />
        │   ├── completar-perfil/
        │   │   └── page.js      # ruta /completar-perfil -- muestra el formulario (US-1.2)
        │   ├── perfil/
        │   │   └── page.js      # ruta /perfil -- muestra "ver mi perfil" (US-1.3)
        │   └── crear-partido/
        │       └── page.js      # ruta /crear-partido -- muestra el formulario (US-2.1), sin verificar (falta correr el SQL)
        ├── components/
        │   ├── ThemeToggle.js         # botón que alterna claro/oscuro y lo guarda en localStorage
        │   ├── LoginForm.js           # dueño de la tarjeta compartida de /login; compone Google + login de prueba (US-1.1)
        │   ├── LoginGoogleForm.js     # botón "Iniciar sesión con Google" (US-1.1) -- signInWithOAuth
        │   ├── LoginPruebaForm.js     # login de prueba (Nombre + Apellido), colapsado por defecto dentro de LoginForm
        │   ├── CompletarPerfilForm.js # formulario de "completar perfil" (US-1.2) -- con guard de sesión (BUG-001)
        │   ├── VerPerfilForm.js       # "ver mi perfil" (US-1.3) + edición (US-1.4) + cerrar sesión (US-1.5) + dar de baja/reactivar (US-1.6) + placeholder de score (BUG-003) -- todo verificado
        │   ├── CrearPartidoForm.js    # formulario de "crear partido" (US-2.1) -- sin verificar (falta correr el SQL)
        │   └── PelotaLoader.js        # loader animado (pelota de pádel picando), reemplaza el texto "Cargando..." en botones y en la carga inicial de /perfil
        └── lib/
            └── supabaseClient.js    # cliente de Supabase para el navegador -- createClient con flowType: "pkce"
```

## 5. Funcionalidades implementadas

- **Health check** (`GET /health`): confirma que el backend está corriendo.
- **Health check de Supabase** (`GET /health/supabase`): confirma que el backend puede autenticarse y hablar con la base de datos real, sin exponer credenciales. Verificado exitosamente por el usuario.
- **Frontend con identidad visual:** proyecto Next.js con tokens de color, tipografías y modo claro/oscuro funcionando, servido en `http://localhost:3000`. Verificado por el usuario en su propia máquina.
- **Tabla `perfiles` en Supabase**, con RLS y sin permiso de DELETE.
- **Login real con Google** (`/login`, US-1.1): OAuth 2.0 vía Google Cloud Console + Supabase Auth (flujo PKCE), redirige a `/perfil` con sesión real. Verificado por el usuario de punta a punta.
- **Login de prueba** (`/login`, herramienta de QA): crea o loguea un usuario de prueba (email+contraseña reales de Supabase Auth, derivados de Nombre+Apellido), redirige a `/perfil`. Verificado (alta) por el usuario.
- **Completar perfil** (`/completar-perfil`, US-1.2): crea la fila del perfil del usuario logueado en `perfiles` (teléfono obligatorio, sin validación de formato), redirige a `/perfil`. Verificado por el usuario. Desde el 2026-09-05 chequea la sesión al entrar a la pantalla (no solo al enviar) y redirige a `/login` si no hay sesión activa (fix de BUG-001).
- **Ver/editar mi perfil** (`/perfil`, US-1.3 y la parte de US-1.4 que no depende de partidos): muestra en modo lectura los 7 datos del perfil (incluido, desde el 2026-09-05, el placeholder de "Score de ranking" hasta que exista la Épica 3 — fix de BUG-003), con un botón "Editar" que permite modificarlos y guardarlos. Sin sesión activa redirige a `/login` en vez de mostrar una pantalla sin salida (fix de BUG-001). Verificado por el usuario.
- **Cerrar sesión** (US-1.5, botón en `/perfil`): construido y verificado por el usuario.
- **Dar de baja mi cuenta** (US-1.6, botón en `/perfil`): dar de baja (con confirmación) y reactivación (al volver a loguearse con una cuenta dada de baja) construidos y verificados por el usuario.

**Con US-1.1 verificada, las 6 historias de usuario de la Épica 1 están completas y funcionando de punta a punta.** El login de prueba sigue siendo una herramienta de QA, no una feature del MVP en sí.

- **Crear partido** (`/crear-partido`, US-2.1): formulario de fecha/hora, cancha y cantidad de jugadores; rechaza fechas pasadas. **Construido, sin verificar todavía** — falta correr `app/backend/sql/002_partidos.sql` en Supabase antes de poder probarlo de punta a punta.

## 6. Cómo correr el proyecto localmente

Backend:
1. `cd app/backend`
2. `npm install` (primera vez)
3. Copiar `.env.example` a `.env` y completar `SUPABASE_URL` / `SUPABASE_ANON_KEY` con los valores reales del proyecto en supabase.com (Project Settings → API — la clave se llama "Publishable key" en proyectos nuevos) — no compartir estos valores en el chat.
4. `npm run dev` (usa `node --watch`, se reinicia solo al guardar cambios)
5. Verificar en el navegador:
   - `http://localhost:3001/health` → `{"status":"ok","service":"app-padel-backend"}`
   - `http://localhost:3001/health/supabase` → `{"status":"ok","message":"Conexión a Supabase verificada correctamente..."}`

Frontend:
1. `cd app/frontend`
2. `npm install` (primera vez — puede tardar unos minutos)
3. Copiar `.env.local.example` a `.env.local` y completar `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los mismos valores reales que usaste en el `.env` del backend.
4. `npm run dev`
5. Abrir `http://localhost:3000/login` — deberías ver la tarjeta de login con el botón de Google arriba y "Entrar con usuario de prueba" colapsado debajo.

Nota Windows: si `npm run dev` (en cualquiera de las dos carpetas) falla con un error raro tipo "X no se reconoce como un comando" y la ruta de tu carpeta de proyecto tiene un `&` en el nombre, es el bug de `cmd.exe` descripto arriba. En `app/frontend` ya está resuelto vía `.npmrc`. Si igual llegara a pasar, se puede correr directo con `node node_modules\next\dist\bin\next dev` (o el binario equivalente del paquete que falle) como alternativa de emergencia.

## 7. Documentación técnica

- **ADR (Architecture Decision Record):** `adr-decisiones-tecnicas.md`. Contiene ADR-001 (elección de Supabase).

## 8. Próximos pasos

**Épica 1 cerrada** (código + testing manual + fixes). **Épica 2 en curso: US-2.1 y US-2.2 cerradas y verificadas, faltan US-2.3 a US-2.6.**

1. **Épica 1 completa en código, probada y con sus bugs corregidos** ✅ (US-1.1 a US-1.6; BUG-001 y BUG-003 corregidos y reverificados el 2026-09-05).
2. **US-2.1 ("Crear partido") cerrada y verificada** ✅ (2026-09-05): SQL corrido (`002`, `003`, `004`), 3 bugs encontrados y corregidos (BUG-004, BUG-005, BUG-006), reverificados por API directa (navegador del asistente + Postman del usuario).
3. **US-2.2 ("Ver partidos abiertos y sumarme") cerrada y verificada** ✅ (2026-09-05): pantalla `/partidos`, columna `lugares_ocupados` + trigger de cupo (`005_us2_2_listado_y_cupo.sql`), verificado con 2 usuarios de prueba (cupo se llena, tercero rechazado, "Salir" libera el lugar).
4. **US-2.3 ("Invitar jugadores a un partido") cerrada y verificada** ✅ (2026-09-05): función `buscar_jugadores_para_invitar`, pantalla `/invitaciones`, búsqueda embebida en `/partidos`, trigger de cupo extendido a `UPDATE` (`006_us2_3_invitar_jugadores.sql`). Verificados los 4 criterios de aceptación con 4 usuarios de prueba, incluido el caso límite de cupo lleno mientras la invitación esperaba.
5. Seguir construyendo la Épica 2 en orden: US-2.4 (confirmar/cancelar asistencia), US-2.5 (ver estado del partido y cancelarlo), US-2.6 (privacidad del teléfono según confirmación — ojo, esta requiere resolver también la lectura cruzada de `perfiles` que quedó como pregunta abierta en US-1.4).
6. **Importante:** cuando "Diseño QA" pase a probar la Épica 2, primero reverifica los 2 fixes de la Épica 1 (BUG-001/BUG-003) antes de empezar con los casos nuevos (decisión del usuario, 2026-09-05).
7. Semilla de 20 canchas reales de Mendoza ya investigada y guardada en `semilla-canchas-epica4.md`, lista para cuando arranque la Épica 4 (no se toca la base todavía).
8. Usuario: crear el repositorio vacío en GitHub cuando quiera (no bloquea nada de lo anterior).
