# Historias de Usuario — MVP App Padel

Documento vivo de historias de usuario (US), organizado por épicas, para el MVP definido en `proyecto-padel-qa-alcance.md`. Se redacta de forma incremental: una épica se detalla por completo (US + criterios de aceptación + pantallas) antes de pasar a la siguiente. Este documento es el insumo funcional tanto para el chat "Crear la app" (qué construir) como para "Diseño QA" (sobre qué diseñar casos de prueba).

Formato de las US: **Como** [rol] **quiero** [acción] **para** [beneficio].
Formato de criterios de aceptación: Gherkin (**Dado** / **cuando** / **entonces**).

## Índice de épicas (alcance MVP — Fase 1)

| # | Épica | Estado |
|---|---|---|
| 1 | Autenticación y Perfil de Usuario | Detallada |
| 2 | Gestión de Partidos | Detallada |
| 3 | Valoración entre Jugadores y Ranking | Detallada |
| 4 | Directorio de Canchas | Detallada |
| 5 | Navegación de Funcionalidades Futuras (ítems bloqueados) | Detallada — MVP completo |

---

## Épica 1: Autenticación y Perfil de Usuario

**Objetivo de negocio:** que cualquier jugador pueda entrar a la app sin fricción (sin crear ni recordar contraseñas) y que el sistema conozca sus datos de juego (nivel, mano hábil, posición) desde el primer uso, ya que esos datos alimentan el matching y el ranking de fases posteriores.

**Roles involucrados:** Usuario común (jugador). No incluye funciones de Admin todavía.

### US-1.1 — Login con Google

Como jugador nuevo o recurrente, quiero iniciar sesión con mi cuenta de Google, para acceder a la app sin crear ni recordar una contraseña nueva.

**Criterios de aceptación:**
- Dado que estoy en la pantalla de login sin sesión iniciada, cuando toco "Continuar con Google", entonces se abre el flujo OAuth de Google.
- Dado que completo el flujo OAuth exitosamente y es mi primer login, cuando Google confirma mi identidad, entonces se crea mi cuenta en la plataforma y soy redirigido a completar mi perfil (US-1.2).
- Dado que ya tengo una cuenta creada, cuando inicio sesión con Google, entonces soy redirigido directamente a la pantalla principal (home) con mi sesión activa.
- Dado que cancelo o cierro la ventana de autenticación de Google, cuando vuelvo a la app, entonces permanezco en login sin sesión iniciada, con un mensaje indicando que no se completó el inicio de sesión.
- Dado que Google devuelve un error (cuenta suspendida, token inválido, etc.), cuando intento iniciar sesión, entonces veo un mensaje de error claro y puedo reintentar.

**Nota técnica/seguridad:** no se maneja contraseña propia; el backend valida el token de Google antes de emitir la sesión propia (vía Supabase Auth). Además, para poder probar funcionalidades multiusuario sin crear cuentas de Gmail reales, "Crear la app" construyó un **login de prueba** con el proveedor real de email+contraseña de Supabase Auth (a partir de Nombre y Apellido se derivan un email y una contraseña de prueba) — no es un mecanismo de login "de mentira" aparte, ejercita el mismo flujo real de sesión y permisos. Queda pendiente, antes de un eventual deploy a producción, decidir si este login de prueba se gatea por variable de entorno o se remueve — ver `estado-tecnico-proyecto.md`. **Nota para diseño de casos de prueba:** el email de prueba se deriva solo del Nombre (no del Apellido) — dos usuarios de prueba distintos necesitan Nombres distintos entre sí, no alcanza con que difieran solo en el apellido (ver detalle en `estado-tecnico-proyecto.md`).

### US-1.2 — Completar perfil de jugador (alta)

Como jugador que inició sesión por primera vez, quiero completar mi perfil de juego (nivel autodeclarado, mano hábil, posición preferida, sexo, zona y teléfono), para que otros jugadores y el sistema de ranking me identifiquen correctamente, y pueda ser contactado cuando corresponda.

**Criterios de aceptación:**
- Dado que es mi primer login, cuando llego a "completar perfil", entonces veo los campos: nivel de juego (categorías **1ª a 7ª**, siendo **1ª la categoría más alta**), mano hábil (diestro/zurdo), posición preferida (drive/revés), sexo (masculino/femenino), zona (Ciudad de Mendoza, Godoy Cruz, Guaymallén, Las Heras, Luján de Cuyo, Maipú, u "Otra zona") y teléfono.
- Dado que intento guardar sin completar un campo obligatorio, cuando toco "Guardar", entonces veo un mensaje de validación indicando qué falta y el perfil no se guarda. **Los 7 campos son obligatorios sin excepción: nivel, mano hábil, posición, sexo, zona y teléfono.**
- Dado que completé todos los campos obligatorios con valores válidos, cuando toco "Guardar", entonces mi perfil se crea (fila en la tabla `perfiles`) y soy redirigido a la pantalla principal.
- Dado que todavía no completé mi perfil, cuando intento acceder a cualquier otra parte de la app, entonces soy redirigido a completarlo — **es obligatorio, no se puede omitir ni completarlo "después"**.

**Notas (antes eran preguntas abiertas — ya resueltas por "Crear la app"):**
- La escala de nivel son categorías de pádel **1ª a 7ª**, donde **1ª es la categoría más alta** (al revés de lo intuitivo) — hay que verificar en testing que la UI lo aclare bien, para evitar que un jugador piense que 1ª es la más baja. Esta misma escala se reutiliza en la Épica 3 para valorar a otros jugadores.
- Completar el perfil es obligatorio antes de usar el resto de la app: si no existe fila en `perfiles` para el usuario logueado, se lo redirige a completarlo.
- Como el perfil recién se crea cuando todos los campos obligatorios están completos, la existencia misma de la fila indica que el perfil está completo (no hace falta un campo aparte tipo "perfil completo").
- Los 7 campos del perfil (nombre, teléfono, sexo, zona, nivel, mano hábil, posición) son obligatorios sin excepción — confirmado por "Crear la app", cierra la pregunta abierta que había quedado planteada sobre si zona y teléfono eran opcionales.
- El teléfono es obligatorio pero **no exige ningún formato específico**: se había agregado una restricción de formato para números de Argentina y se removió después por decisión del usuario ("suma una dificultad innecesaria") — alcanza con que el campo no esté vacío.

### US-1.3 — Editar perfil

Como jugador con cuenta creada, quiero poder editar mi nivel autodeclarado, mano hábil, posición preferida, sexo, zona y teléfono, para mantener mi información actualizada.

**Criterios de aceptación:**
- Dado que estoy en mi pantalla de perfil, cuando toco "Editar", entonces puedo modificar nivel, mano hábil, posición, sexo, zona y teléfono.
- Dado que guardo cambios válidos, cuando toco "Guardar", entonces los cambios se reflejan inmediatamente en mi perfil.
- Dado que intento guardar dejando un campo obligatorio vacío, entonces el sistema lo rechaza igual que en el alta (US-1.2).

### US-1.4 — Ver perfil propio y de otros jugadores

Como jugador, quiero ver mi perfil y el de otros jugadores con quienes comparto un partido, para conocer su nivel, mano hábil y posición antes de jugar.

**Criterios de aceptación:**
- Dado que entro a mi perfil, cuando la pantalla carga, entonces veo mi nivel autodeclarado, mi score de ranking (si ya tengo valoraciones recibidas), mano hábil, posición, sexo y zona.
- Dado que veo el perfil de otro jugador con quien comparto un partido, entonces veo su nivel autodeclarado y su score de ranking, pero **no** sus datos de contacto salvo que corresponda.
- **Nota de privacidad (heredada del doc de alcance):** el teléfono de un jugador solo es visible si confirmó el partido — esa regla se implementa en la Épica 2 (ver US-2.6).
- **Nota (heredada a la Épica 3):** el "score de ranking" que se muestra acá se calcula en base a las valoraciones recibidas — el detalle de ese cálculo y su comparación contra el nivel autodeclarado se define en la Épica 3 (ver US-3.2 y US-3.3).
- **Resuelto (2026-09-05):** además de ver el perfil de compañeros de partido, cualquier jugador puede ver la vista reducida de cualquier otro jugador activo a través del **Directorio de jugadores** (US-3.5, Épica 3) — no hace falta compartir un partido. Sigue sin exponerse el teléfono ni otros datos de contacto fuera de la excepción de US-2.6.

### US-1.5 — Cerrar sesión

Como jugador con sesión iniciada, quiero poder cerrar sesión, para dejar de tener acceso activo desde un dispositivo compartido.

**Criterios de aceptación:**
- Dado que tengo sesión iniciada, cuando toco "Cerrar sesión", entonces se invalida mi sesión activa y soy redirigido al login.
- Dado que cerré sesión, cuando intento acceder a una URL interna de la app directamente (o navego "atrás" en el navegador), entonces soy redirigido al login y no veo contenido protegido.

### US-1.6 — Dar de baja mi cuenta

Como jugador con cuenta creada, quiero poder dar de baja mi cuenta, para dejar de estar disponible en la plataforma sin que se elimine mi historial ni el de otros jugadores que dependen de él (partidos jugados, valoraciones dadas o recibidas).

**Criterios de aceptación:**
- Dado que estoy en mi perfil, cuando elijo la opción de dar de baja mi cuenta y confirmo, entonces mi perfil pasa a estar inactivo (`activo = false`, se registra `dado_de_baja_en`) — **el registro no se borra**.
- Dado que intento eliminar (borrar realmente) mi perfil manipulando el request a la API directamente, entonces el backend/base de datos lo rechaza: la tabla `perfiles` no tiene habilitada ninguna política de `DELETE` en Supabase, así que un borrado real es estructuralmente imposible desde la aplicación, no solo una restricción de la UI.
- Dado que inicio sesión (con Google o con el login de prueba) con una cuenta dada de baja (`activo = false`), cuando el sistema lo detecta, entonces no accedo directo a mi perfil: veo una pantalla propia que me pregunta si quiero reactivar mi cuenta.
- Dado que estoy en esa pantalla y confirmo "Reactivar mi cuenta", entonces mi perfil vuelve a `activo = true` (se limpia `dado_de_baja_en`) y accedo normalmente a mi perfil.
- Dado que estoy en esa pantalla y toco "Cancelar", entonces se cierra mi sesión y vuelvo al login, sin reactivar mi cuenta.

**Notas (antes eran preguntas abiertas — ya resueltas por "Crear la app"):**
- La reactivación de una cuenta dada de baja requiere confirmación explícita del jugador — no es automática por el solo hecho de volver a iniciar sesión.
- La confirmación antes de dar de baja es solo un cuadro de diálogo explícito (sin reingresar la contraseña) — es una acción reversible (se puede reactivar), así que no amerita esa fricción extra.

**Preguntas abiertas (definir en "Crear la app", dependen de que exista la Épica 2):**
- ¿Un jugador dado de baja se sigue mostrando (con su nombre) en partidos pasados donde participó, para no romper el historial de otros jugadores, o se anonimiza ahí?
- ¿Qué pasa con los partidos futuros donde el jugador está anotado o es organizador al momento de darse de baja — se cancelan, se lo remueve de la lista dejando el partido con un lugar libre, u otra cosa?

**Nota técnica/seguridad:** la baja es un *soft delete* (`activo = false` + `dado_de_baja_en`), nunca un `DELETE` real. Esto no es solo una decisión de diseño de la aplicación: la tabla `perfiles` en Supabase directamente no tiene política RLS de `DELETE`, así que ni siquiera manipulando la API se podría borrar una fila de verdad — el mismo principio de "la regla vive en el backend/base de datos, no solo en la UI" que ya aparece en otras épicas (privacidad de teléfono, autorización de cancelación de partido).

### Pantallas involucradas (Épica 1)

1. **Login** — una única tarjeta compartida: botón "Continuar con Google" arriba (ancho completo, mismo estilo que cualquier otro botón de la app); debajo, colapsado, un login de prueba (Nombre + Apellido) para pruebas multiusuario sin cuentas de Gmail reales — un botón chico "Entrar con usuario de prueba" expande el formulario en el mismo lugar, sin navegar a otra pantalla ni abrir un modal; mensaje de error si el flujo falla o se cancela.
2. **Completar perfil (alta)** — formulario: nivel, mano hábil, posición, sexo, zona, teléfono; botón "Guardar" deshabilitado hasta completar todos los campos obligatorios (ver patrón transversal de UX más abajo).
3. **Perfil propio** — datos de juego + score de ranking (o placeholder "aún sin valoraciones") + botón "Editar" + botón "Cerrar sesión" + opción de dar de baja la cuenta.
4. **Editar perfil** — mismo formulario que el alta, precargado con los valores actuales; mismo patrón de botón "Guardar" deshabilitado hasta completar los campos obligatorios.
5. **Perfil de otro jugador (vista reducida)** — nivel, score, mano hábil, posición; sin datos de contacto salvo la excepción de Épica 2.
6. **Confirmar baja de cuenta** — cuadro de diálogo de confirmación explícito (sin reingresar contraseña) antes de ejecutar la baja.
7. **Reactivar cuenta** — pantalla mostrada al iniciar sesión con una cuenta dada de baja, con las opciones "Reactivar mi cuenta" o "Cancelar" (cierra sesión sin reactivar).

**Patrón transversal de UX (aplica a los 3 formularios con botón de enviar/guardar de esta épica — login de prueba, completar perfil, editar perfil):** el botón queda deshabilitado mientras no estén completos todos los campos obligatorios, en vez de habilitarlo siempre y validar recién al tocarlo. Ver caso de prueba transversal CP-1.7.2 en `casos-prueba-epica1-perfil.md`.

**Flujo de navegación:** Login → (si es primer ingreso) Completar perfil → Home; (si ya tiene perfil) → Home directo; (si la cuenta está dada de baja) → pantalla de reactivación → (si reactiva) Home, (si cancela) vuelve a Login. Desde Home se accede a "Mi perfil" y, desde un partido compartido, al perfil reducido de otro jugador. Desde "Mi perfil" también se accede a "Editar perfil" y a "Dar de baja mi cuenta" (con confirmación previa).

---

## Épica 2: Gestión de Partidos

**Objetivo de negocio:** que un jugador pueda organizar un partido o sumarse a uno existente sin fricción, y que quede claro en todo momento cuántos lugares quedan, quién confirmó, y quién puede tomar qué acción — es el corazón funcional de la app (todo lo demás, ranking y estadísticas futuras, depende de que existan partidos jugados).

**Roles involucrados:** Usuario común (jugador), con un rol adicional implícito de organizador (el jugador que creó el partido) dentro de esta épica — no es un rol de sistema nuevo, es una condición sobre un partido puntual.

### US-2.1 — Crear partido

Como jugador, quiero crear un partido especificando fecha, hora, cancha/lugar y cantidad de jugadores necesarios, para poder organizar un juego y que otros se sumen.

**Criterios de aceptación:**
- Dado que estoy en Home, cuando toco "Crear partido", entonces veo un formulario con campos obligatorios: fecha, hora, cancha/lugar, cantidad de jugadores necesarios.
- Dado que completo todos los campos obligatorios con valores válidos, cuando confirmo, entonces el partido se crea con estado **abierto** y quedo automáticamente anotado y confirmado como organizador.
- Dado que intento crear un partido con fecha/hora en el pasado, cuando confirmo, entonces el sistema rechaza la creación con un mensaje de validación.
- Dado que dejo un campo obligatorio vacío, cuando confirmo, entonces veo un mensaje de validación y el partido no se crea.

**Preguntas abiertas (definir en "Crear la app"):**
- ~~¿La cancha se elige del Directorio de Canchas (Épica 4) o es texto libre?~~ **Resuelto en la Épica 4 (ver US-4.3):** se elige del directorio, con texto libre como fallback si el directorio está vacío. Hasta que la Épica 4 se construya, el campo es texto libre siempre (no hay directorio todavía).
- ~~¿La cantidad de jugadores es fija (4, dobles) o variable?~~ **Resuelto (2026-09-05, "Crear la app"):** es **variable** — el organizador la especifica al crear el partido (campo numérico, mínimo 2), no queda fija en 4. Así se puede usar para singles, dobles o formatos con más jugadores (ej. americano) sin modelar un tipo de partido aparte. Ver `app/backend/sql/002_partidos.sql`.

### US-2.2 — Ver partidos abiertos y sumarme a uno

Como jugador, quiero ver la lista de partidos abiertos disponibles y sumarme a uno, para jugar sin tener que organizarlo yo.

**Criterios de aceptación:**
- Dado que entro a "Partidos abiertos", cuando la pantalla carga, entonces veo un listado con fecha, hora, cancha y lugares ocupados/totales de cada partido en estado **abierto**.
- Dado que un partido tiene lugares disponibles, cuando toco "Sumarme", entonces quedo agregado a la lista de jugadores del partido.
- Dado que un partido ya está **completo**, cuando lo veo en el listado, entonces la opción "Sumarme" no está disponible y el estado se muestra como tal.
- Dado que ya estoy anotado en un partido, cuando lo veo en el listado o en su detalle, entonces no puedo sumarme una segunda vez (veo la opción de salir, no de sumarme de nuevo).

### US-2.3 — Invitar jugadores a un partido

Como jugador organizador, quiero invitar directamente a otros jugadores a mi partido, para completarlo con gente conocida en vez de esperar a que se sumen del listado abierto.

**Criterios de aceptación:**
- Dado que soy organizador de un partido abierto con lugares disponibles, cuando busco un jugador y lo invito, entonces ese jugador ve la invitación pendiente en su propia sección de invitaciones.
- Dado que el jugador invitado acepta, cuando confirma, entonces queda agregado al partido igual que si se hubiera sumado del listado abierto.
- Dado que el jugador invitado rechaza, cuando confirma el rechazo, entonces el lugar sigue disponible para otros.
- Dado que el partido se completa por otra vía (alguien más se sumó) mientras una invitación está pendiente, cuando el jugador invitado intenta aceptarla, entonces el sistema le informa que ya no hay lugar disponible.

### US-2.4 — Confirmar (o cancelar) asistencia

Como jugador anotado en un partido, quiero confirmar mi asistencia (o cancelarla si no puedo ir), para que el organizador y los demás sepan con quién cuentan.

**Criterios de aceptación:**
- Dado que estoy anotado en un partido, cuando toco "Confirmar asistencia", entonces mi estado dentro del partido pasa a **confirmado**.
- Dado que todos los jugadores requeridos ya confirmaron, cuando el último lo hace, entonces el estado del partido pasa a **completo**.
- Dado que soy jugador anotado o confirmado y salgo del partido **con más de 1 hora de anticipación** a la fecha/hora del partido, cuando confirmo la salida, entonces mi lugar vuelve a quedar disponible y, si el partido estaba **completo**, vuelve a **abierto**.
- **Decisión (2026-09-05, a pedido del usuario):** salir de un partido — sea que esté anotado o ya confirmado — solo se permite hasta 1 hora antes del partido, para evitar bajas de último momento que dejan al resto sin poder reemplazarlo a tiempo. Dado que soy jugador anotado o confirmado y falta menos de 1 hora para el partido, cuando intento salir, entonces el sistema no me lo permite y explica el motivo. Esta restricción no aplica a rechazar una invitación (estado "invitado"): ahí nunca hubo un lugar realmente ocupado, se puede rechazar en cualquier momento.

### US-2.5 — Ver y gestionar el estado del partido

Como jugador (organizador u otro participante), quiero ver el estado de un partido y, si soy el organizador, poder cancelarlo, para que todos sepan si el partido sigue en pie.

**Criterios de aceptación:**
- Dado que veo el detalle de un partido, cuando la pantalla carga, entonces veo su estado actual: **abierto / completo / cancelado / jugado**.
- Dado que soy el organizador, cuando toco "Cancelar partido", entonces el estado pasa a **cancelado** y todos los jugadores anotados lo ven reflejado.
- Dado que un jugador que no es el organizador intenta cancelar el partido manipulando el request directamente (no por la UI), entonces el backend rechaza la operación (autorización por dueño del partido, no solo ocultar el botón en la UI).
- Dado que un partido estaba **completo** y su fecha/hora ya pasó, cuando el sistema lo detecta, entonces el estado pasa a **jugado**.

### US-2.6 — Privacidad del teléfono según confirmación

Como jugador confirmado en un partido, quiero ver el teléfono de contacto de los demás jugadores confirmados (y no el de quienes todavía no confirmaron), para poder coordinar detalles del partido sin exponer datos de gente que quizás ni siquiera vaya a jugar.

**Criterios de aceptación:**
- Dado que otro jugador del partido confirmó su asistencia, cuando veo su perfil dentro del detalle del partido, entonces veo su número de teléfono.
- Dado que otro jugador está anotado pero **no** confirmó asistencia, cuando veo su perfil dentro del partido, entonces **no** veo su teléfono.
- Dado que intento obtener el teléfono de un jugador no confirmado manipulando el request a la API directamente, entonces el backend no lo incluye en la respuesta (la regla vive en el backend, no es solo un ocultamiento visual).

**Actualización (2026-09-12):** además de la confirmación, ahora hace falta que el propio jugador habilite mostrar su teléfono: se sumó `perfiles.mostrar_telefono` (booleano, default `false`) y `ver_participantes_partido()` solo devuelve el teléfono si se cumplen **las dos condiciones** — confirmado **y** `mostrar_telefono = true` (antes alcanzaba con estar confirmado). Mismo criterio de privacidad que el opt-in de WhatsApp ya construido (2026-09-06). Ver `app/backend/sql/049_telefono_opcional.sql`. ⚠️ **Pendiente de confirmar:** no hay evidencia de que esta migración se haya corrido contra el proyecto real de Supabase (no está reflejada en `app/backend/schema-completo.sql`) — no dar por vigente esta regla más estricta hasta confirmarlo.

### US-2.7 — Marcador en vivo con reconocimiento de voz (y respaldo táctil)

> **Nota de alcance:** historia grande, sumada a pedido explícito del usuario (2026-09-05) tras varias rondas de preguntas para definir el diseño de punta a punta (comandos de voz, respaldo táctil, layout de pantalla). Cubre tanto partidos armados por la app como partidos jugados "por fuera" (ver US-2.8). Esta historia ya fija el diseño completo — "Crear la app" puede construir directamente sobre estos criterios, sin otra ronda de preguntas de alcance.

Como jugador, quiero llevar el marcador de mi partido en vivo usando la voz con un vocabulario fijo de comandos (ej. "marcador, punto A"), con un respaldo táctil para corregir manualmente si hace falta, para que se vea reflejado en pantalla en tiempo real sin depender de tocar el teléfono mientras juego.

**Reglas de pádel que tiene que modelar el sistema (confirmadas por el usuario):**
- Partido a mejor de 3 sets.
- Cada set lo gana quien primero llega a 6 juegos con 2 de diferencia; si llegan a 6-6, se define por **tie-break a 7** (también con 2 de diferencia) — en el tie-break el conteo de puntos es numérico simple (1, 2, 3...), no 15/30/40.
- El tercer set (si el partido queda 1 set a 1) se juega **completo**, igual que los otros dos — no hay super-tie-break corto.
- Juego: 0 - 15 - 30 - 40 - juego. **Punto de oro configurable**: el organizador elige, al crear el partido, si en 40-40 se juega con "punto de oro" (el próximo punto define el juego, sin ventaja) o con ventaja/deuce tradicional.
- El saque se identifica **por pareja**, no por jugador individual (alcanza para interpretar correctamente el orden del marcador — quién dice su tanteo primero) — se indica quién saca al arrancar el partido/set, y alterna entre las dos parejas siguiendo la mecánica estándar (cada juego cambia el saque).

**Comandos de voz (vocabulario fijo, micrófono siempre activo):**

Todo comando arranca con la palabra clave **"marcador"** — es lo que evita que una charla cualquiera en la cancha ("che, ese fue punto para nosotros") se interprete como una carga real. El sistema ignora cualquier audio que no matchee alguno de estos patrones:

| Comando | Acción |
|---|---|
| "Marcador, punto A" | Suma un tanto a la pareja A (interpretado según juego/tie-break y punto de oro) |
| "Marcador, punto B" | Suma un tanto a la pareja B |
| "Marcador, deshacer" | Revierte el último punto cargado — se puede decir varias veces seguidas para retroceder más de un punto |
| "Marcador, estado" | El sistema repite en voz alta (texto a voz) el nombre de las dos parejas y el tanteo actual |
| "Marcador, pausa" | Deja de escuchar tantos (para discusiones, tomar agua, etc.) |
| "Marcador, continuar" | Reanuda la escucha después de una pausa |
| "Marcador, saque A" / "Marcador, saque B" | Corrección manual de quién saca, por si el sistema lo calculó mal |
| "Marcador, apelar" | Dispara el flujo de apelación (US-2.9) |
| "Marcador, juegos X Y" (ej. "juegos 5 3") | **Agregado 2026-09-13.** Corrige de una sola vez el marcador de juegos (games) del set en curso, dejándolo en X-Y — para cuando quedó mal por algún punto que no se escuchó/tocó bien, sin tener que decir "deshacer" las veces necesarias para retroceder juego por juego. Si el nuevo resultado corregido queda 6-6, el sistema entra directamente a tie-break, igual que si se hubiera llegado ahí jugando. Acepta tanto los números dicho como palabra ("cinco", "tres") como en dígito ("5", "3"), porque el reconocimiento de voz no siempre los convierte igual. |

El sistema no distingue **quién** de los 4 jugadores dice el comando — cualquiera de los dos equipos puede cantar el tanto en voz alta y se toma igual, tal como se juega hoy en una cancha real sin la app.

**Anuncios automáticos por voz:** al ganarse un juego, el sistema anuncia "juego para [pareja]" seguido del score de juegos del set (ej. "3 a 2"); al ganarse un set, anuncia "set para [pareja]" seguido del score de sets; al ganarse el partido, anuncia "partido para [pareja]". Además, después de cada punto cargado, confirma en voz el nombre de ambas parejas y el tanteo actual (ej. "Juan y Pedro 15, Martín y Diego 30") — es la principal señal de que el comando se registró bien, ya que nadie tiene por qué estar mirando la pantalla en el momento de cantar el punto.

**Respaldo táctil:** además de la voz, la pantalla del marcador tiene botones (chicos, pero con tamaño cómodo para tocar) para sumar o restar puntos, ajustar el score de juegos por set, y cambiar manualmente quién saca — para los casos en que el reconocimiento de voz falle o alguien prefiera corregir directo. Estos botones están siempre visibles (no ocultos detrás de un tap adicional). Las correcciones táctiles **no quedan auditadas con detalle de quién/cuándo** — se confía en la buena fe de los jugadores en esta primera versión; si en el futuro esto genera abuso, se puede revisar (ver `mejoras-backlog.md`).

**Criterios de aceptación:**
- Dado que soy uno de los jugadores del partido (de cualquiera de las dos parejas), cuando abro la pantalla de marcador, entonces el reconocimiento de voz está activo por defecto y puedo decir cualquiera de los comandos de la tabla de arriba para que se registre.
- Dado que se indicó quién saca, cuando digo "marcador, punto A" o "marcador, punto B", entonces el sistema suma el tanto a la pareja correspondiente, interpretándolo según las reglas de juego/set/tie-break vigentes.
- Dado que se cumple la condición de juego/set/partido según las reglas de arriba, cuando el sistema lo detecta, entonces avanza automáticamente de juego a juego, de set a set, anuncia el resultado por voz (ver "Anuncios automáticos" arriba), y declara el partido terminado cuando corresponde — sin que el jugador tenga que decir nada adicional al tanteo.
- Dado que el reconocimiento de voz cargó mal un punto, cuando digo "marcador, deshacer" (una o varias veces seguidas), entonces el sistema retrocede esa cantidad de puntos al estado anterior correcto.
- Dado que la voz falla o alguien prefiere corregir directo, cuando toco los botones táctiles del marcador, entonces puedo sumar/restar puntos, ajustar el score de juegos de un set, o cambiar quién saca, con el mismo efecto que si lo hubiera dicho por voz.
- Dado que estoy jugando, cuando veo la pantalla del marcador, entonces el tanteo ocupa gran parte de la pantalla con texto grande y colores de alto contraste, pensado para leerse desde cualquier punto de la cancha (el teléfono apoyado, no en la mano) — no un marcador chico pensado para sostener y mirar de cerca. Debajo del tanteo grande se muestra el tiempo jugado transcurrido (única estadística de esta primera versión).
- Dado que otro jugador de mi partido dice un tanteo o hace una corrección táctil desde su propio dispositivo, cuando eso pasa, entonces mi pantalla se actualiza sola, sin que yo tenga que refrescar (sincronización en tiempo real entre los que juegan, no hace falta que la vean espectadores ajenos al partido).
- Dado que el partido termina, cuando se define el resultado final, entonces se guarda automáticamente como el resultado del partido — no hay un paso de confirmación aparte que lo bloquee.

**Preguntas abiertas (definir en "Crear la app" antes de construir):**
- Qué pasa si el reconocimiento de voz no está disponible en el navegador/dispositivo (ahí el respaldo táctil pasa a ser el único modo, a confirmar que cubre el 100% de los casos sin la voz).
- Si además del marcador en vivo conviene guardar un historial punto por punto (para poder revisar cómo se llegó al resultado) o alcanza con guardar el resultado final de cada set.

**Actualización (2026-09-13) — 3 agregados construidos sobre el marcador ya en producción:**
- **Comando de voz "marcador, juegos X Y":** ver la fila agregada a la tabla de comandos de arriba — corrige de una el marcador de juegos del set en curso en vez de tener que deshacer punto por punto.
- **Modo apaisado manual (reemplaza un enfoque anterior con una limitación real):** la primera versión intentaba detectar la orientación física del teléfono para agrandar el tablero automáticamente al girarlo — en la práctica esto no servía para buena parte de los jugadores, porque si el celular tiene el auto-rotate del sistema operativo apagado (algo común), el navegador nunca reporta el giro y el marcador quedaba atascado en vertical sin ningún control para forzarlo. Se reemplazó por un botón manual "Modo apaisado" (que pasa a mostrar "Modo vertical" una vez activado) que fuerza visualmente la rotación de toda la pantalla del marcador con un truco de CSS (`position: fixed` + `transform: rotate(90deg)`), sin depender de si el dispositivo reporta o no su orientación real — quien lo toca ya sabe que después tiene que girar el teléfono para leerlo bien.
- **Selector de tema visual:** además del tema clásico ("Tema verde"), un botón permite alternar a un tema alternativo ("Tema neón": fondo negro con textos y acentos en verde fosforescente). Es un cambio puramente estético (variables CSS de color/tipografía) — no toca ninguna regla de juego ni el estado sincronizado del marcador. La elección se guarda en `localStorage` del dispositivo, no en la base de datos: cada jugador puede elegir su propio tema sin afectar el de los demás, y no se sincroniza entre los dispositivos de un mismo partido (a diferencia del tanteo en sí).

### US-2.8 — Registrar un partido jugado fuera de la app (modo ad-hoc)

Como jugador, quiero poder usar el marcador en vivo para un partido que armé por mi cuenta (sin pasar por "Crear partido" de la app, por ejemplo juntándome con amigos), para que quede registrado igual que si lo hubiera organizado por la app.

**Criterios de aceptación:**
- Dado que quiero anotar un partido que no armé por la app, cuando arranco el modo "marcador libre", entonces puedo escribir los nombres de los otros 3 jugadores (cantidad fija en 4 para este modo, a diferencia del 2 a 4 variable de "Crear partido" por app) sin tener que invitarlos formalmente.
- Dado que escribo un nombre parcial (ej. "Mati"), cuando el sistema encuentra coincidencias entre los usuarios ya registrados, entonces me muestra un **desplegable** con esas coincidencias (ej. "Matías Pepino") para seleccionar la cuenta real, en vez de tipear el nombre completo a mano libre.
- Dado que el nombre que escribo no coincide con ningún usuario registrado, cuando confirmo, entonces ese jugador queda cargado como invitado libre (solo el nombre, sin cuenta ni datos de perfil asociados) — no bloquea la carga del partido.
- Dado que yo soy quien lleva el marcador de un partido ad-hoc, cuando el partido termina, entonces el resultado queda registrado en mi propio historial siempre — sea que los demás jugadores tengan cuenta o no.
- El resto del comportamiento (reglas de pádel, voz, sincronización, guardado automático) es el mismo que en US-2.7.

**Nota técnica importante (para "Crear la app"):** un partido ad-hoc se registra **en el momento en que se juega** (no se agenda a futuro como los partidos armados por "Crear partido") — esto choca con la validación ya construida en `partidos` que rechaza cualquier `fecha_hora` que no sea futura (BUG-005, ver `registro-errores.md`). El modelo de datos de esta historia probablemente necesita su propia tabla o una forma distinta de registrar el partido, no reutilizar `partidos` tal cual está — a diseñar en detalle cuando se construya.

### US-2.9 — Apelar y corregir un resultado en disputa

Como jugador registrado que participó de un partido, quiero poder apelar el resultado guardado si no estoy de acuerdo con lo que quedó registrado, para que un administrador pueda revisarlo y corregirlo si corresponde.

**Criterios de aceptación:**
- Dado que participé de un partido con resultado ya guardado, cuando no estoy de acuerdo con ese resultado, entonces puedo iniciar una apelación.
- Dado que hay una apelación pendiente, cuando un usuario con rol de **superusuario** la revisa, entonces puede corregir el resultado guardado del partido.
- Dado que no soy superusuario, cuando intento corregir el resultado de un partido (mío o ajeno) manipulando el request directamente, entonces el backend rechaza la operación.
- **Decisión (2026-09-05):** el rol de superusuario es un sistema de roles real (un campo en `perfiles`, no un hardcodeo de una sola cuenta) — pensado para poder sumar más de un superusuario/moderador en el futuro, aunque al arrancar solo lo tenga el usuario dueño del proyecto.
- **Decisión (2026-09-05):** la apelación **no tiene plazo límite** — se puede iniciar en cualquier momento, aunque haya pasado mucho tiempo desde que se jugó el partido. El detalle fino de cómo se resuelve una apelación muy vieja (ej. si ya se valoró el partido en la Épica 3) se termina de definir más adelante, no bloquea esta decisión de fondo.

**Resuelto al construir (2026-09-05):**
- Un invitado libre (sin cuenta, US-2.8) no puede apelar — no tiene sesión con la que hacerlo, así que la apelación queda naturalmente limitada a usuarios registrados sin necesitar una regla aparte.
- El superusuario revisa las apelaciones pendientes entrando a la pantalla "Apelaciones" — no hay aviso proactivo todavía (sigue ligado a US-3.4, notificaciones, cuando se construya).
- **Sí queda auditoría**: cada apelación guarda `resultado_anterior` y `resultado_nuevo` (snapshot completo del marcador antes/después de la corrección) además de quién la resolvió y cuándo — el resultado nunca se sobreescribe "en silencio".
- Al corregir un resultado, los puntos de ranking (US-3.1) se recalculan automáticamente: se revierten los puntos del resultado viejo y se aplican los del corregido.

### Pantallas involucradas (Épica 2)

1. **Crear partido** — formulario: fecha, hora, cancha/lugar, cantidad de jugadores.
2. **Partidos abiertos (listado)** — fecha, hora, cancha, cupos ocupados/totales, botón "Sumarme".
3. **Detalle de partido** — estado actual, lista de jugadores (confirmados/pendientes, con teléfono visible solo para los confirmados), botón "Confirmar asistencia" / "Cancelar mi asistencia" para cualquier jugador anotado, y botones "Invitar jugador" / "Cancelar partido" visibles solo para el organizador.
4. **Invitar jugador** — buscador de jugadores + botón "Invitar".
5. **Mis invitaciones** — invitaciones pendientes recibidas, con botones "Aceptar" / "Rechazar".
6. **Mis partidos** — listado personal de partidos donde estoy anotado, con su estado.
7. **Marcador en vivo** (US-2.7/2.8) — pantalla de tanteo tipo cartel (texto grande, alto contraste, pensada para verse de lejos), activación del reconocimiento de voz, indicador de quién saca; botón de "Modo apaisado"/"Modo vertical" (manual) y selector de tema visual ("Tema verde"/"Tema neón").
8. **Marcador libre / ad-hoc** (US-2.8) — variante de "Crear partido" para un partido no agendado: carga de hasta 3 jugadores (vinculados a usuarios existentes o como invitados libres), lleva directo al marcador en vivo.
9. **Apelaciones** (US-2.9) — para el jugador: iniciar una apelación sobre un resultado propio; para el superusuario: bandeja de apelaciones pendientes con opción de corregir el resultado.

**Flujo de navegación:** Home → "Partidos abiertos" (sumarme) o "Crear partido" → Detalle de partido. En paralelo: Home → "Mis invitaciones" → Aceptar/Rechazar → (si acepto) Detalle de partido. Desde el detalle, el organizador puede invitar más jugadores o cancelar el partido; cualquier jugador anotado puede confirmar o cancelar su propia asistencia.

---

## Épica 3: Ranking por Resultados de Partidos

> **Nota de decisión (2026-09-05):** el enfoque original de esta épica (valorar el nivel de otros jugadores por percepción, después de cada partido) fue **reemplazado por completo** a pedido explícito del usuario por un ranking calculado en base a **resultados objetivos de partidos jugados** (games y sets ganados), no en base a que los compañeros pongan una nota. Ver US-3.1 para la regla de cálculo. Queda pendiente, como tarea aparte, renombrar la carpeta/archivos físicos de esta épica ("Épica 3 - Valoración y Ranking") para reflejar el nuevo enfoque — no se tocan en este cambio.

**Objetivo de negocio:** que el nivel de un jugador dejе de depender únicamente de lo que él mismo declaró, incorporando el resultado real de los partidos que juega — esto es lo que le da valor real al "nivel" dentro de la app (evita que alguien se autodeclare de un nivel más alto o más bajo del real), y de paso funciona como incentivo para usar la app seguido.

**Roles involucrados:** Usuario común (jugador). Depende directamente de la Épica 2 — en particular de que un partido tenga un resultado guardado (US-2.7/US-2.8) — y reutiliza la escala de nivel autodeclarado definida en la Épica 1 (US-1.2) solo a fines de comparación (US-3.3), ya no para el cálculo del ranking en sí.

### US-3.1 — Ranking por resultados de partidos jugados

Como jugador, quiero que cada partido que juego y termina con un resultado sume puntos a mi ranking automáticamente según ese resultado (games ganados y si gané o perdí), para tener una medida objetiva de mi nivel basada en resultados reales, no en percepción de mis compañeros.

**Regla de cálculo de puntos (confirmada por el usuario, 2026-09-05):**
- **2 puntos por cada game ganado**, para las dos parejas del partido (ganadora y perdedora por igual) — así perder un set ajustado (ej. 5-7) da más puntos que perder por goleada (ej. 0-6): se premia también la resistencia, no solo la victoria.
- **+5 puntos de bono** para la pareja ganadora, una sola vez por partido completo (no por set).
- Los dos integrantes de una misma pareja reciben el mismo puntaje (no se reparte entre los dos).
- El ranking es **acumulado de por vida** — no es un promedio, y no hay temporadas que lo reseteen. Es deliberado: busca premiar tanto el nivel de juego como el uso frecuente de la app (a más partidos jugados, más puntos posibles), funciona como incentivo de actividad. **Actualización (2026-09-13):** esto sigue siendo así tal cual — el acumulado de toda la vida sigue existiendo y ahora se ve en el Directorio de jugadores (US-3.5) como la vista **"Histórico"**. Conviven con esa vista otras dos, **"Semanal"** y **"Mensual"**, que no son un ranking distinto ni resetean nada: agrupan los mismos puntos ya calculados por esta regla, sumando solo los de partidos jugados dentro de la semana o el mes calendario en curso, calculado al vuelo desde el historial de partidos cada vez que se pide (sin ningún job de reseteo ni tabla aparte). Son 3 formas distintas de mirar el mismo dato, no 3 sistemas de puntos separados.
- Aplica tanto a partidos armados por la app (US-2.1 a US-2.6) como a partidos ad-hoc (US-2.8), **incluidos los partidos con jugadores invitados sin cuenta**. **Riesgo aceptado conscientemente (2026-09-05):** esto abre la puerta a que alguien registre partidos ficticios contra invitados inventados para sumar puntos sin límite — el usuario decidió aceptar ese riesgo en vez de restringir el modo ad-hoc, priorizando la simplicidad del sistema; a revisar si se vuelve un problema real de uso (ver `mejoras-backlog.md`).
- Un invitado libre sin cuenta (US-2.8) no acumula puntos propios — no tiene perfil donde guardarlos. Solo suman puntos los jugadores con cuenta real que participaron del partido.

**Criterios de aceptación:**
- Dado que participé en un partido que llegó a un resultado final (por app o ad-hoc), cuando el resultado se guarda, entonces mis puntos de ranking se recalculan sumando 2 puntos por cada game que gané en ese partido, más 5 puntos si mi pareja ganó el partido.
- Dado que perdí un partido, cuando se calculan los puntos, entonces igual sumo los puntos correspondientes a los games que gané durante el partido (nunca puntos negativos, nunca se resta por perder).
- Dado que jugué un partido ad-hoc con uno o más invitados sin cuenta, cuando se calculan los puntos, entonces los jugadores con cuenta real suman sus puntos normalmente y el/los invitados sin cuenta no acumulan nada.
- Dado que intento alterar mis puntos de ranking manipulando el request directamente (no a través de un partido real jugado), entonces el backend rechaza la operación — los puntos solo se generan como consecuencia automática de guardar el resultado de un partido.

**Resuelto al construir (2026-09-05):**
- Al corregirse un resultado por apelación (US-2.9), los puntos se **recalculan automáticamente** dentro de `resolver_apelacion`: revierte los puntos del resultado viejo y aplica los del corregido, sin ajuste manual del superusuario.
- Un partido cancelado o sin resultado guardado **no suma ningún punto** — los puntos solo se otorgan cuando `resultados_partido.finalizado` pasa a `true` (ver el trigger `aplicar_resultado_partido`); no existe un concepto de "puntos parciales" por games jugados sin resultado final.

### US-3.2 — Ver mi ranking acumulado

Como jugador, quiero ver mi puntaje de ranking acumulado en mi perfil, para saber cómo voy evolucionando en base a los partidos que jugué.

**Criterios de aceptación:**
- Dado que jugué al menos un partido con resultado guardado, cuando veo mi perfil, entonces veo mi puntaje de ranking acumulado (suma de los puntos de todos los partidos jugados hasta el momento).
- Dado que todavía no jugué ningún partido con resultado guardado, cuando veo mi perfil, entonces veo un placeholder (ej. "0 puntos — todavía no jugaste ningún partido") en vez de un puntaje calculado sobre cero partidos.
- Dado que juego un partido nuevo y se guarda su resultado, cuando vuelvo a mi perfil, entonces mi puntaje ya refleja los puntos ganados en ese partido.

### US-3.3 — Comparar mi ranking vs. mi nivel autodeclarado

Como jugador, quiero ver la comparación entre mi puntaje de ranking (por resultados reales) y mi nivel autodeclarado (categoría 1ª-7ª de mi perfil), para saber si mi autopercepción de nivel coincide con cómo me está yendo realmente en la cancha.

**Criterios de aceptación:**
- Dado que tengo nivel autodeclarado y al menos un partido jugado con puntos de ranking, cuando veo mi perfil, entonces veo ambos valores mostrados de forma comparable (uno junto al otro, o con alguna indicación de la relación entre ambos).
- Dado que todavía no jugué ningún partido, cuando veo mi perfil, entonces solo se muestra mi nivel autodeclarado, sin intentar comparar contra un ranking inexistente.

### US-3.4 — Notificaciones de actividad en mis partidos

> **Nota de alcance:** esta historia se agregó a pedido explícito del usuario (2026-09-05), sumada acá aunque temáticamente pertenece más a la Épica 2 (Gestión de Partidos) que a la valoración/ranking — decisión de organización del usuario, no un error de ubicación.

Como jugador, quiero recibir un aviso cuando pasa algo relevante en mis partidos (se abre un partido nuevo, aceptan o rechazan mi invitación, o se cancela un partido en el que participo), para enterarme sin tener que entrar a revisar cada pantalla a cada rato.

**Criterios de aceptación:**
- Dado que se crea un partido nuevo en estado abierto, cuando eso pasa, entonces recibo un aviso (a definir: a todos los jugadores, o solo a los que cumplen algún criterio — ver pregunta abierta).
- Dado que invité a un jugador y él acepta o rechaza mi invitación, cuando eso pasa, entonces recibo un aviso con el resultado.
- Dado que estoy anotado/confirmado en un partido y el organizador lo cancela, cuando eso pasa, entonces recibo un aviso de la cancelación.
- Dado que no quiero recibir más avisos, cuando desactivo las notificaciones, entonces dejo de recibirlas sin tener que dar de baja mi cuenta (misma idea que "sumarme"/"salir" de un partido: tiene que ser igual de fácil optar por no recibirlas).

**Resuelto al construir (2026-09-05):**
- **Mecanismo:** solo dentro de la app (campanita con contador en Home + lista desplegable) — sin push del navegador, para no sumar la complejidad de permisos/service worker a un MVP.
- **"Partido nuevo abierto":** decisión (2026-09-05) — **no se avisa a nadie** por este evento. Sin un criterio de relevancia real todavía construido (zona, nivel), avisar a todos los jugadores por cada partido creado se vuelve spam apenas haya varios usuarios activos; queda como posible mejora futura si se define ese criterio (ver `mejoras-backlog.md`). Sí se avisan invitaciones (aceptada/rechazada) y cancelaciones, que son siempre relevantes para quien las recibe.
- **Historial:** se guardan, en una tabla `notificaciones` con estado leída/no leída (no son efímeras) — permite ver notificaciones viejas y contar las no leídas para el badge de la campanita.
- Apagar notificaciones es un toggle en "Mi perfil" (`perfiles.notificaciones_activas`), sin tener que dar de baja la cuenta — mismo criterio que "salir de un partido": tiene que ser igual de fácil optar por no recibirlas.

### US-3.5 — Directorio de jugadores

> **Nota de alcance:** sumada a pedido explícito del usuario (2026-09-05), a raíz de pensar en una futura pantalla principal con navegación a Ranking/Marcador/Perfil/Jugadores. Resuelve la pregunta abierta de privacidad que había quedado pendiente en US-1.4 (Épica 1): hasta ahora, un jugador solo podía ver el perfil de otro si compartía un partido con él — esta historia habilita verlo para cualquier jugador de la app.

Como jugador, quiero ver un directorio con todos los jugadores activos de la app (no solo con quienes comparto un partido), poder filtrarlos, e invitarlos a mis partidos o contactarlos, para conocer con quién puedo jugar más allá de mi círculo actual.

**Criterios de aceptación:**
- Dado que entro al directorio, cuando la pantalla carga, entonces veo la lista de jugadores activos con: nombre, nivel autodeclarado, ranking por puntos (US-3.1), mano hábil y sexo — sin teléfono ni otros datos de contacto, igual de restringido que la vista reducida ya existente entre compañeros de partido.
- Dado que uso los filtros disponibles (nombre, nivel, sexo, ranking), cuando los aplico, entonces la lista se acota a las coincidencias.
- Dado que soy organizador de un partido propio con lugares disponibles, cuando invito a un jugador del directorio, entonces se dispara el mismo mecanismo de invitación de US-2.3 (queda como invitación pendiente para ese jugador).
- Dado que quiero enviarle un mensaje a un jugador del directorio, esta acción **depende de que exista la mensajería directa (MEJ-021 en `mejoras-backlog.md`), que todavía no está construida** — hasta entonces, el botón de mensaje no está disponible o queda marcado como "Próximamente" (Épica 5).
- Dado que un jugador se da de baja de su cuenta (US-1.6), cuando eso pasa, entonces deja de aparecer en el directorio (mismo criterio que "activo = false" ya usado en el resto de la app).

**Preguntas abiertas (definir en "Crear la app"):**
- Al invitar desde el directorio, si tengo más de un partido propio abierto con lugares disponibles, ¿elijo a cuál invitarlo (selector de "mis partidos abiertos"), o el sistema me lleva directo a "Crear partido" con este jugador precargado para invitar apenas se cree?

**Actualización (2026-09-13) — vistas por período y podio visual:**
- Dado que estoy en el directorio, cuando elijo entre las 3 vistas disponibles ("Semanal", "Mensual", "Histórico" — toggle de 3 botones), entonces el listado y el orden del ranking se recalculan según los puntos sumados en esa ventana de tiempo. "Histórico" es el mismo acumulado de toda la vida de US-3.1; "Semanal" y "Mensual" agrupan ese mismo historial de partidos por semana/mes calendario en curso — no son un ranking aparte, ni resetean ni tocan los puntos acumulados de nadie.
- Dado que el listado tiene 3 o más jugadores, cuando la pantalla carga, entonces los primeros 3 puestos se destacan en un **podio visual** (con los colores de medalla oro/plata/bronce por puesto), donde la **altura de cada columna es proporcional a los puntos de ese jugador** (no una altura fija por puesto) — si el 2° y el 3° puesto están muy cerca en puntos, sus columnas se ven casi igual de altas; si el 1° les saca mucha diferencia, la diferencia de altura tiene que notarse.

### US-3.6 — Kudos y detalle de puntos por partido (con privacidad)

> **Nota de alcance:** sumada a pedido explícito del usuario (2026-09-13), pensada junto con el Directorio de jugadores (US-3.5) — busca darle más vida social al ranking sin exponer contra quién jugó cada uno ni el detalle de cómo le fue en ese partido puntual.

Como jugador, quiero ver el detalle de los partidos que le sumaron puntos de ranking a otro jugador y poder darle "kudos" a cada uno, para reconocer su actividad y sus resultados sin necesidad de conocer contra quién jugó ni las estadísticas detalladas de ese partido.

**Criterios de aceptación:**
- Dado que veo el perfil de otro jugador, cuando despliego la sección "Partidos y puntos de ranking", entonces veo, por cada partido que le sumó puntos, la fecha, la cancha y la cantidad de puntos ganados en ese partido — **sin el nombre del rival ni ninguna otra estadística del partido** (ni marcador, ni sets, ni con quién jugó).
- Dado que veo uno de esos partidos en la lista de otro jugador, cuando toco el botón de kudos (👍), entonces le doy kudos a ese partido puntual y el contador visible sube en uno.
- Dado que ya le había dado kudos a ese partido, cuando vuelvo a tocar el mismo botón, entonces se lo saco (toggle simple dar/sacar) y el contador baja en uno.
- Dado que otro jugador ve mi propio perfil, cuando despliega esta misma sección, entonces ve mi lista con la misma restricción de privacidad (sin mis rivales ni el detalle del partido) y puede darme kudos de la misma forma.

**Decisión de privacidad (2026-09-13):** lo agregado y ya público (los puntos totales de ranking, la posición en el Directorio) se sigue mostrando sin problema — ya es visible para cualquiera vía US-3.5. Pero el detalle de un partido puntual (contra quién jugué, el resultado exacto de ese partido) se trata como información privada de ese partido y **no se expone** en esta vista, aunque el punto ganado en sí sí se muestre. Es la misma lógica de "lo agregado es público, el detalle puntual es privado" que ya aplica al teléfono según confirmación (US-2.6) y a los datos de contacto en general (US-1.4) — cierra, de paso, cualquier duda que pudiera quedar abierta sobre cuánto mostrar del historial de otro jugador al sumar esta vista nueva.

### Pantallas involucradas (Épica 3)

1. **Mi perfil** (ya existente, Épica 1) — se actualiza para mostrar el ranking por puntos acumulados junto al nivel autodeclarado, comparables entre sí.
2. **Perfil de otro jugador** (ya existente, Épica 1) — se actualiza para mostrar el ranking ya calculado de ese jugador, junto con la lista reducida de partidos que le dieron puntos y el botón de kudos por partido (US-3.6).
3. **Notificaciones** (US-3.4) — pantalla o componente nuevo (a definir junto con el mecanismo): lista de avisos pendientes/recientes, con una opción para desactivarlas.
4. **Directorio de jugadores** (US-3.5) — pantalla nueva: lista filtrable de jugadores activos con su vista reducida de perfil, podio visual de los primeros 3 puestos, toggle de vistas Semanal/Mensual/Histórico, y acciones de invitar (y, más adelante, mensaje).

**Flujo de navegación:** el ranking en sí no tiene una pantalla propia para "entrar a hacer algo" — se calcula solo, automáticamente, cada vez que se guarda el resultado de un partido (US-2.7/US-2.8), y se ve reflejado la próxima vez que se abre "Mi perfil" o el perfil de otro jugador. El directorio de jugadores sí es una pantalla propia: Home → "Jugadores" → filtro/búsqueda → perfil reducido de un jugador → (si soy organizador con cupo) invitar a uno de mis partidos.

## Épica 4: Directorio de Canchas

**Objetivo de negocio:** que el jugador resuelva el "dónde jugar" dentro de la misma app, sin depender de referencias externas (grupos de WhatsApp, boca en boca) — y que ese mismo directorio alimente el campo "cancha" al crear un partido (Épica 2), en vez de quedar como un dato de texto libre suelto y propenso a errores. El documento de alcance lo define explícitamente como un **listado estático, sin sistema de reservas todavía** (eso queda para Fase 2 del roadmap).

**Roles involucrados:** Usuario común (jugador) consulta el directorio. El documento de alcance define un rol Admin de "gestión general de la plataforma", pero para esta épica su alcance concreto es una pregunta abierta (ver más abajo) — no se asume una pantalla de administración solo porque el rol existe en el papel.

### US-4.1 — Ver listado de canchas

Como jugador, quiero ver un listado de las canchas disponibles con su descripción, valores y teléfono de contacto, para elegir dónde jugar sin depender de información externa a la app.

**Criterios de aceptación:**
- Dado que entro a "Canchas", cuando la pantalla carga, entonces veo un listado con nombre, descripción, valores/tarifas y teléfono de contacto de cada cancha cargada.
- Dado que todavía no hay ninguna cancha cargada, cuando entro a "Canchas", entonces veo un mensaje explicando que no hay canchas disponibles por el momento (no una pantalla vacía sin contexto).

**Resuelto al construir (2026-09-05):** confirmada la lectura del documento de alcance — no hay pantalla de administración en el MVP; las canchas se cargan por seed/SQL directo (`011_canchas_predictivo.sql`, `012_mas_canchas_mendoza.sql`, `015_canchas_otras_provincias_mock.sql`, `023_us4_1_us4_2_detalle_canchas.sql`), sin UI de Admin. `descripcion` y `valores` quedan nullable a propósito (son datos reales de negocios reales investigados por fuera, no corresponde inventarles precio/descripción ficticios) — la UI muestra "Consultar valores"/"Sin descripción cargada todavía" como fallback.

**Actualización (2026-09-13) — datos reales de Mendoza y restricción deliberada de qué se muestra:** se cargaron los datos reales de **51 clubes de pádel de Mendoza**, extraídos de atcsports.io/results (plataforma real de reserva de canchas) — ver `051_canchas_reales_atc_mendoza.sql` y `052_canchas_atc_detalle_existentes.sql` (de los 51, 11 ya estaban cargados con nombre parecido desde el seed original, así que solo se agregaron los 40 restantes para no duplicar ni romper reseñas de demo ya enganchadas). Estos datos incluyen horario, cantidad de canchas (techadas/descubiertas, superficie), amenities y un precio de referencia — pero **la UI del listado deliberadamente solo muestra nombre, zona, dirección y la cantidad de canchas** (ej. "6 canchas"), no el horario, el precio ni las amenities, aunque esos datos sí estén guardados en la tabla `canchas`. Es una decisión explícita del usuario de mantener la pantalla simple ("no te dije que pongas todos esos datos, solo... la cantidad de canchas"), no una limitación de los datos disponibles — quedan guardados por si se deciden mostrar más adelante.

### US-4.2 — Ver detalle de una cancha

Como jugador, quiero ver el detalle completo de una cancha del listado, para decidir si me sirve antes de contactarla.

**Criterios de aceptación:**
- Dado que toco una cancha del listado, cuando entro a su detalle, entonces veo su información completa: nombre, dirección/zona, descripción, valores y teléfono de contacto.
- Dado que estoy en el detalle de una cancha, cuando vuelvo atrás, entonces regreso al listado completo (no se pierde el contexto de navegación).

**Actualización (2026-09-13):** en la práctica, el detalle muestra el mismo subconjunto reducido y deliberado que el listado (US-4.1): nombre, dirección (con link directo a Google Maps) y zona, teléfono (con link directo a WhatsApp) y cantidad de canchas — **no** horario, precio ni amenities, aunque esos datos estén guardados en la base junto con el resto de la información real de los 51 clubes de Mendoza. No es "información completa" en el sentido literal del criterio original, sino la información completa que el usuario decidió que vale la pena mostrar.

### US-4.3 — Elegir una cancha del directorio al crear un partido

Como jugador que crea un partido, quiero elegir la cancha desde el Directorio de Canchas en vez de escribirla a mano, para evitar errores de tipeo y que el partido quede asociado a información de contacto real y consistente.

**Criterios de aceptación:**
- Dado que estoy creando un partido, cuando llego al campo "cancha", entonces puedo buscar y seleccionar una cancha existente del directorio, en vez de escribirla como texto libre.
- Dado que el directorio de canchas está vacío (todavía no se cargó ninguna), cuando creo un partido, entonces el sistema me permite completar el campo como texto libre (fallback), para no bloquear la creación de partidos por falta de datos de canchas.
- Dado que creé un partido eligiendo una cancha del directorio, cuando veo el detalle del partido, entonces puedo acceder al detalle de esa cancha (US-4.2) sin tener que ir a buscarla de nuevo desde el listado general.

**Nota (cierra una pregunta abierta de la Épica 2):** esta historia resuelve la pregunta abierta que había quedado planteada en US-2.1 sobre el origen del campo "cancha".

**Actualización (2026-09-13) — vínculo real cancha↔partido:** se agregó `partidos.cancha_id` (columna nueva, `uuid` nullable, FK a `canchas.id` — ver `057_partidos_cancha_id.sql`). Al crear un partido eligiendo una sugerencia real del autocompletado (`CampoCancha.js`), se guarda ese id junto con el texto; el detalle del partido (US-2.5) usa ese `cancha_id` directo para el link "Ver cancha" en vez de la heurística anterior de matchear por nombre exacto contra el Directorio (esa heurística, encontrada como necesaria al corregir BUG-012, queda ahora solo como respaldo para partidos viejos o creados con un texto que no coincidió con ninguna cancha real — en esos casos `cancha_id` queda `null` y el sistema sigue funcionando igual que antes, sin romper el acceso). Resuelve también la pregunta abierta equivalente que había quedado planteada en US-9.1.

### Pantallas involucradas (Épica 4)

1. **Canchas (listado)** — nombre, breve descripción y valores de cada cancha; mensaje de "sin canchas disponibles" si el listado está vacío.
2. **Detalle de cancha** — información completa: nombre, dirección/zona, descripción, valores, teléfono de contacto.
3. **Crear partido** (ya existente, Épica 2) — se actualiza el campo "cancha" para incluir un buscador/selector contra el directorio, con fallback a texto libre si el directorio está vacío.

**Flujo de navegación:** Home → "Canchas" → listado → detalle de una cancha. Desde "Crear partido": campo "cancha" → buscador del directorio (mismo listado) → selecciono una cancha (o completo texto libre si no hay ninguna cargada).

## Épica 5: Navegación de Funcionalidades Futuras

**Objetivo de negocio:** que el jugador tenga una pantalla principal real (con su actividad a la vista, US-5.3) y que, desde el MVP, vea que la app tiene un camino de crecimiento (reservas, estadísticas, notificaciones, etc.) sin poder usarlas todavía — comunica que el producto está vivo, sin generar la falsa expectativa de que esas funciones ya andan. Lo segundo está basado directamente en el punto 5 del documento de alcance ("Funcionalidades 'en construcción' visibles").

**Roles involucrados:** Usuario común (jugador). Es la épica de navegación/UI general de la app — no agrega entidades de negocio nuevas propias, aunque US-5.3 sí compone datos que vienen de las otras épicas (partidos, ranking, invitaciones) — y tiene un componente de seguridad importante (ver US-5.2), por eso se detalla como épica propia y no como nota suelta en otra.

**Nota (2026-09-05):** esta épica dejó de ser "la más chica" — al sumarse US-5.3 (Pantalla principal), ahora también define el home real de la app, no solo los badges de "Próximamente" (US-5.1/5.2), que siguen aplicando igual sobre los ítems de fases futuras ya documentadas en `proyecto-padel-qa-alcance.md` (Fase 2: reservas de cancha; Fase 3: estadísticas, historial, notificaciones, filtros; Fase 4: PWA offline).

### US-5.1 — Ver ítems de menú bloqueados con badge "Próximamente"

Como jugador, quiero ver en el menú las funcionalidades que todavía no están disponibles marcadas claramente como "Próximamente", para saber qué se viene sin confundirlas con funcionalidades activas.

**Criterios de aceptación:**
- Dado que entro al menú principal, cuando la pantalla carga, entonces veo los ítems de funcionalidades de fases futuras junto con los ítems activos, cada uno con un badge visual "Próximamente".
- Dado que toco un ítem marcado como "Próximamente", cuando confirmo el toque, entonces no navego a ninguna pantalla funcional (el sistema me indica que está en desarrollo, sin simular una funcionalidad real).
- Dado que veo el menú completo, cuando comparo un ítem activo contra uno bloqueado, entonces la diferencia visual es clara e inequívoca (no debo dudar si algo funciona o no).

**Resuelto al construir (2026-09-05):** subconjunto curado de 4 ítems representativos del roadmap (Reservar cancha, Estadísticas de partido, Dividir gastos, Modo sin conexión) en una sección "Se viene" del Home, cada uno con badge "Próximamente" — no los ~15 ítems completos del roadmap documentado, para no saturar la pantalla. Al tocar un ítem, se muestra un mensaje breve en el momento ("todavía está en desarrollo") sin navegar a ninguna pantalla.

### US-5.2 — Impedir el acceso a funcionalidades bloqueadas manipulando la URL

Como responsable de la seguridad de la app, quiero que ninguna funcionalidad de fases futuras sea accesible manipulando la URL directamente, para no exponer pantallas a medio construir ni datos inconsistentes a un jugador curioso (o malintencionado).

**Criterios de aceptación:**
- Dado que una funcionalidad de fase futura no tiene ruta ni endpoint implementado todavía, cuando un usuario intenta acceder a una URL que apuntaría a ella, entonces el sistema muestra una pantalla de error controlada (404 / "no disponible"), nunca una pantalla rota, en blanco, o con datos parciales.
- Dado que una funcionalidad de fase futura ya tiene ruta implementada en el backend pero todavía no está liberada a usuarios (ej. en desarrollo activo), cuando un jugador intenta acceder manipulando la URL o el request directo a la API, entonces el backend rechaza el acceso con la misma lógica de autorización que ya protege otras acciones sensibles de la app (ver, por ejemplo, CP-2.5.4 en la Épica 2).

**Nota técnica/seguridad:** este es el mismo principio de "autorización en el backend, no solo ocultamiento en la UI" que ya aparece en las Épicas 2 y 3 (privacidad de teléfono, cancelación de partido, autovaloración) — acá se aplica a nivel de features completas en vez de acciones puntuales.

### US-5.3 — Pantalla principal (Home)

> **Nota de alcance:** sumada a pedido explícito del usuario (2026-09-05), a partir de pensar en la navegación general de la app. **Cambia el carácter de esta épica**: ya no es solo "mostrar badges de Próximamente" (eso sigue siendo US-5.1/5.2), sino que ahora también define el home real de la app — la primera pantalla que ve el jugador, con un resumen personalizado y accesos directos, en formato de scroll largo (una sola página, sin pestañas).

Como jugador, quiero que la primera pantalla que veo al entrar tenga un resumen de mi actividad y accesos directos a las secciones principales, para tener todo lo relevante a la vista sin tener que navegar a cada pantalla por separado.

**Contenido de la pantalla, de arriba hacia abajo:**
1. Saludo personalizado + mi ranking por puntos actual (US-3.1), sin tener que entrar a "Mi perfil".
2. **Mi próximo partido**: si tengo uno a futuro (anotado o confirmado — a definir cuál cuenta, ver pregunta abierta de cuando se propuso esta pantalla), lo muestro destacado con fecha, hora, cancha y rivales.
3. **Aviso de invitaciones pendientes**: si tengo una o más sin responder, un cartel visible que lleva directo a "Mis invitaciones".
4. Dos accesos grandes y destacados: **"Crear partido"** y **"Ver partidos abiertos"** (las dos acciones más frecuentes).
5. **Último partido jugado**: rival, fecha y resultado final (ya es posible mostrarlo real gracias a US-2.7/US-2.8).
6. **Racha**: cantidad de partidos ganados seguidos, si corresponde (ej. "Llevás 3 partidos ganados seguidos").
7. **Mi posición en el ranking general** (ej. "Estás #12"), no solo el puntaje pelado.
8. **Estadística rápida**: partidos jugados totales y % de victorias.
9. **Espacio de publicidad**: un banner reservado para monetización futura — mientras no haya un anunciante real, muestra una cancha recomendada del Directorio (Épica 4) en su lugar, para que el espacio no quede vacío.
10. **Tip de juego corto según tu posición** (drive o revés, de tu perfil): un consejo breve de pádel, distinto para cada posición — banco de tips fijo (no requiere pantalla de administración), rotando uno por visita.
11. Resto de accesos: Marcador, Ranking, Directorio de jugadores (US-3.5), Canchas, Perfil — junto con los ítems "Próximamente" (US-5.1).
12. **Pie de página fijo al final del scroll**: "© 2026 Eduardo Manucha. Todos los derechos reservados."

**Criterios de aceptación:**
- Dado que entro a la app con sesión iniciada y perfil completo, cuando cargo la pantalla principal, entonces veo los bloques de arriba en ese orden, en una sola página de scroll continuo (no tabs ni pasos).
- Dado que no tengo ningún partido próximo, cuando veo el bloque "Mi próximo partido", entonces veo un mensaje neutro invitando a crear o sumarse a uno, en vez de un bloque vacío o roto.
- Dado que no tengo invitaciones pendientes, cuando veo esa sección, entonces no se muestra el cartel (no ocupa espacio si no aplica).
- Dado que todavía no jugué ningún partido, cuando veo "Último partido jugado", "Racha" y "Estadística rápida", entonces cada uno muestra un placeholder acorde (mismo criterio que ya se usa para el ranking sin valoraciones, Épica 1/3), no un cálculo sobre cero partidos.
- Dado que no hay ningún anunciante real cargado, cuando veo el espacio de publicidad, entonces se muestra la cancha recomendada de reemplazo, nunca un espacio en blanco.
- Dado que mi perfil tiene una posición cargada (drive o revés), cuando veo el bloque de tip de juego, entonces veo un consejo corto acorde a esa posición (no genérico).
- Dado que llego al final del scroll, cuando la página termina, entonces veo el pie de página con la atribución y los derechos reservados.

**Preguntas abiertas (definir en "Crear la app"):**
- "Mi próximo partido", ¿cuenta el más próximo entre los que estoy **confirmado**, o también los que estoy solo **anotado** sin confirmar todavía?
- ¿Cómo se define una cancha "recomendada" para el espacio de publicidad de reemplazo (la más cercana a mi zona, una al azar, la mejor valorada) — no bloquea el diseño de esta historia, es un detalle de implementación.

### US-5.4 — Instalar la app en el dispositivo (PWA)

> **Nota de alcance:** sumada a pedido explícito del usuario (2026-09-13). El manifest, los íconos y el service worker de la PWA ya estaban armados de antes, pero no había ningún control real en la UI para ofrecer la instalación — sin esto, dependía por completo de que el navegador la sugiriera solo, algo que muchos usuarios ni notan.

Como jugador, quiero poder instalar Padelito en mi celular como una app, para acceder más rápido con un ícono propio en mi pantalla de inicio, sin pasar por el navegador cada vez.

**Criterios de aceptación:**
- Dado que uso un navegador que soporta la instalación directa (Android/Chrome/Edge), cuando ese navegador dispara el evento `beforeinstallprompt`, entonces veo un botón "Instalar" — al tocarlo, se dispara el flujo nativo de instalación del propio navegador.
- Dado que uso iOS Safari (que no soporta ese evento del todo), cuando llego a la sección de instalación, entonces en vez de un botón que no funcionaría veo instrucciones manuales paso a paso: tocar "Compartir", elegir "Agregar a pantalla de inicio" y confirmar tocando "Agregar".
- Dado que la app ya está instalada (o la acabo de instalar), cuando entro a Configuración o al Home, entonces no veo ningún control de instalación (ni banner ni sección activa) — no tiene sentido seguir ofreciéndola.
- Dado que todavía no la instalé, cuando entro a "Configuración", entonces el control para instalarla está siempre visible ahí, sin poder descartarlo; en el Home, en cambio, aparece como un banner que puedo cerrar — si lo cierro, no vuelve a aparecer en esa misma sesión del navegador, pero sí la próxima vez que abra la app en una sesión nueva (o en otro dispositivo/navegador).

**Resuelto al construir (2026-09-13):** implementado en un único componente (`InstalarApp.js`) reutilizado en dos lugares con un solo prop que cambia el comportamiento de descarte: en Configuración (siempre visible, no se puede cerrar) y en el Home (banner descartable, con la elección de "ya lo vi" guardada en `sessionStorage` — se repite en cada sesión nueva del navegador, no queda oculto para siempre). La detección de "ya está instalada" usa `display-mode: standalone` (estándar) y `navigator.standalone` (variante histórica de iOS).

### Pantallas involucradas (Épica 5)

1. **Pantalla principal / Home** (US-5.3) — resumen personalizado + accesos directos, según el detalle de arriba; incluye el banner descartable de "Instalar Padelito" (US-5.4) cuando corresponde.
2. **Menú principal** (ya existente, se actualiza) — incorpora los ítems de fases futuras junto a los activos, cada uno con el badge "Próximamente".
3. **Pantalla o mensaje de "Próximamente"** — contenido mínimo mostrado al intentar acceder a un ítem bloqueado (por UI o por URL manipulada), sin exponer detalles internos de desarrollo.
4. **Configuración** (ya existente, no documentada en detalle en este documento por quedar fuera del alcance de esta épica salvo por este punto) — incluye, entre otras opciones de apariencia, el control permanente de "Instalar Padelito" (US-5.4).

**Flujo de navegación:** Login → Pantalla principal (Home) → desde ahí, acceso directo a cualquier sección (Crear partido, Partidos abiertos, Marcador, Ranking, Jugadores, Canchas, Perfil, Mis invitaciones) o a un ítem "Próximamente". Al tocar un ítem con badge "Próximamente", me quedo en la pantalla actual o veo el mensaje/pantalla de "Próximamente" (según se defina en "Crear la app"), sin acceder a una pantalla funcional real. Si intento la misma ruta escribiendo la URL a mano, el resultado es el mismo: error controlado o rechazo de autorización, nunca acceso real.

---

**Con esta épica se completa el detalle funcional de las 5 épicas del MVP** (`proyecto-padel-qa-alcance.md`, Fase 1). Las 5 tienen ahora: historias de usuario con criterios de aceptación en Gherkin, pantallas involucradas, flujo de navegación, y su matriz de casos de prueba manuales correspondiente (`casos-prueba-epicaX.md`).

---

# Post-MVP: Épicas de mejoras (2026-09-06)

> **Nota de origen:** con las 5 épicas del MVP construidas y probadas, se decidió (a pedido del usuario) convertir el `mejoras-backlog.md` acumulado durante el desarrollo en historias de usuario formales, organizadas en épicas nuevas, para seguir construyendo. **MEJ-002 y MEJ-003 no aparecen acá** porque ya quedaron absorbidas por US-3.4 y US-2.7/2.8/2.9/US-3.1 respectivamente. **MEJ-016 y MEJ-017 tampoco** — son tareas de infraestructura de testing (seed reproducible, proyecto de staging), no historias de usuario de la app, y quedan a cargo del chat "Automatización". **MEJ-001 (selector de fecha/hora propio) y MEJ-022 (explorar reconocimiento de gestos)** quedan como tareas de pulido/spike sueltas, no como historias de usuario formales — la primera es un ajuste puramente visual sin lógica nueva, la segunda es una investigación abierta, no una feature con criterios de aceptación cerrables.
>
> **Orden de prioridad decidido (2026-09-06):** Épicas 6, 7, 9 y 10 primero (extienden funcionalidad ya construida) — Épica 8 (Matchmaking Proactivo) al final, por ser la que más diseño de algoritmo nuevo requiere con menos base existente para apoyarse.

## Épica 6: Gestión Avanzada de Partidos

**Objetivo de negocio:** dar más control y visibilidad sobre el ciclo de vida de un partido más allá del MVP básico — historial, filtros, reglas de nivel, recurrencia, viralidad — para que la app siga siendo útil a medida que crece el volumen de uso real. Extiende directamente la Épica 2.

**Roles involucrados:** Usuario común (jugador), organizador (condición sobre un partido puntual, igual que en la Épica 2).

### US-6.1 — Ver mi historial de partidos (Mis partidos)

Como jugador, quiero ver un listado de todos los partidos donde participé, incluidos los ya jugados o cancelados, para repasar mi actividad pasada sin que se mezcle con los partidos abiertos a los que me puedo sumar.

**Criterios de aceptación:**
- Dado que entro a "Mis partidos", cuando la pantalla carga, entonces veo todos los partidos donde soy organizador o participante, en cualquier estado (abierto, completo, cancelado, jugado), ordenados por fecha descendente.
- Dado que un partido está "jugado" y tiene resultado guardado, cuando lo veo en el listado, entonces veo su resultado final (rival y marcador) sin tener que entrar al detalle o al marcador.
- Dado que no participé de ningún partido todavía, cuando entro a esta pantalla, entonces veo un mensaje placeholder claro.

*(Origen: MEJ-004)*

### US-6.2 — Filtrar partidos abiertos

Como jugador, quiero filtrar el listado de partidos abiertos por zona, fecha y nivel, para encontrar más rápido uno que me sirva cuando hay muchos disponibles.

**Criterios de aceptación:**
- Dado que aplico un filtro de zona, fecha y/o nivel (ver US-6.3 para qué significa "nivel" de un partido), cuando lo aplico, entonces el listado se acota a las coincidencias.
- Dado que no hay resultados para el filtro aplicado, cuando lo veo, entonces aparece un mensaje claro en vez de una lista vacía sin contexto.

*(Origen: MEJ-007)*

### US-6.3 — Nivel mínimo/máximo al crear un partido

Como organizador, quiero declarar un rango de nivel aceptado para mi partido, para que quien se sume sepa si es un partido pensado para su nivel, sin bloquear a nadie que igual quiera jugar.

**Criterios de aceptación:**
- Dado que estoy creando un partido, cuando completo el formulario, entonces puedo declarar opcionalmente un nivel mínimo y máximo aceptado (por defecto, sin restricción).
- Dado que un jugador fuera de ese rango ve el partido en el listado o intenta sumarse, cuando lo hace, entonces ve una advertencia clara del desajuste de nivel, pero puede sumarse igual — **decisión (2026-09-06): la restricción es informativa, no bloqueante**, para no ser rígido con grupos mixtos que en la práctica juegan bien juntos.

*(Origen: MEJ-005)*

### US-6.4 — Lista de espera para partidos completos

Como jugador, quiero anotarme en una lista de espera de un partido completo, para enterarme automáticamente si se libera un lugar, en vez de tener que estar revisando a mano.

**Criterios de aceptación:**
- Dado que un partido está completo (`lugares_ocupados >= cantidad_jugadores`), cuando lo veo en el listado, entonces veo la opción "Anotarme en lista de espera" en vez de "Sumarme".
- Dado que se libera un lugar (alguien cancela su asistencia), cuando eso pasa, entonces el primero de la lista de espera recibe una notificación (US-3.4) invitándolo a confirmar su lugar.
- Dado que confirmo mi lugar desde esa notificación, cuando lo hago, entonces quedo anotado igual que si me hubiera sumado del listado abierto — si no confirmo en un plazo razonable (a definir en "Crear la app"), el siguiente de la lista recibe el aviso.
- Dado que hay más de un jugador en la lista de espera, cuando se libera un lugar, entonces se respeta el orden de anotación (primero en anotarse, primero en ser avisado).

*(Origen: MEJ-010, depende de US-3.4 ya construida)*

### US-6.5 — Marcar inasistencia (no-show)

Como organizador, quiero marcar que un jugador confirmado no se presentó al partido, para que quede un registro de cumplimiento visible en su perfil.

**Criterios de aceptación:**
- Dado que el partido ya pasó su fecha/hora, cuando entro a su detalle, entonces el organizador puede marcar como "no-show" a cualquier jugador que estaba confirmado (no a los que ya cancelaron a tiempo).
- Dado que un jugador acumula no-shows, cuando alguien ve su perfil, entonces ve un contador visible (mismo criterio de visibilidad que el ranking — público, no solo para el propio jugador).
- **Decisión (2026-09-06):** el no-show es **solo informativo por ahora** — no bloquea anotarse a partidos futuros ni afecta el ranking de puntos (US-3.1), que son cosas distintas. Se puede revisar a futuro si se vuelve necesario un efecto más concreto (ver `mejoras-backlog.md`).

*(Origen: MEJ-011)*

### US-6.6 — Partidos recurrentes

Como organizador, quiero repetir un partido ya jugado con una nueva fecha, para no tener que recrearlo de cero cada vez que juego con el mismo grupo.

**Criterios de aceptación:**
- Dado que estoy en el detalle de un partido pasado (jugado o cancelado) del que fui organizador, cuando lo veo, entonces tengo la opción "Repetir este partido".
- Dado que la elijo, cuando se abre "Crear partido", entonces el formulario viene precargado con la misma cancha, cantidad de jugadores y configuración (punto de oro, rango de nivel si aplica), pidiéndome solo la nueva fecha/hora.
- **Alcance (2026-09-06):** es una duplicación simple ("repetir una vez"), no una serie recurrente con excepciones — cada repetición es un partido nuevo e independiente.

*(Origen: MEJ-012)*

### US-6.7 — Compartir un partido por link

Como organizador, quiero compartir mi partido por un link, para invitar gente que todavía no usa la app sin que tenga que buscarlo dentro de ella.

**Criterios de aceptación:**
- Dado que estoy en el detalle de mi partido, cuando toco "Compartir", entonces puedo copiar un link público a ese partido.
- Dado que alguien sin cuenta abre ese link, cuando lo hace, entonces ve una vista pública mínima (fecha, hora, cancha, cupos ocupados/totales) — sin datos de contacto de nadie.
- Dado que esa persona toca "Sumarme" desde la vista pública, cuando lo hace, entonces se le pide iniciar sesión (o crear cuenta) primero, y al volver queda anotada directamente en ese partido — no tiene que volver a buscarlo.

**Preguntas abiertas (definir en "Crear la app"):**
- ¿La vista pública es una ruta nueva sin autenticación (ej. `/p/[link_publico]`), o simplemente la misma pantalla de detalle con una versión reducida para quien no tiene sesión? Cambia el diseño técnico pero no el criterio de aceptación.

*(Origen: MEJ-006)*

### Pantallas involucradas (Épica 6)

1. **Mis partidos** (US-6.1) — pantalla nueva: listado personal en cualquier estado, con resultado visible si ya se jugó.
2. **Partidos abiertos** (ya existente) — se le suman filtros (US-6.2) y la opción de lista de espera cuando corresponde (US-6.4).
3. **Crear partido** (ya existente) — se le suma el rango de nivel opcional (US-6.3) y precarga al "repetir" (US-6.6).
4. **Detalle de partido** (ya existente) — se le suman "Repetir este partido" (US-6.6), "Compartir" (US-6.7) y marcar no-show (US-6.5, solo visible para el organizador sobre partidos pasados).
5. **Vista pública de un partido** (US-6.7) — mínima, sin sesión, solo para quien llega por link compartido.

## Épica 7: Comunidad entre Jugadores

**Objetivo de negocio:** profundizar el vínculo entre jugadores más allá de partidos puntuales — quiénes son mis conocidos, con quién ya jugué y cómo me fue, y facilitar coordinar directo con ellos sin salir de la app.

**Roles involucrados:** Usuario común.

### US-7.1 — Lista de jugadores frecuentes

Como jugador, quiero marcar a otros jugadores como frecuentes, para invitarlos rápido a mis partidos sin tener que buscarlos cada vez.

**Criterios de aceptación:**
- Dado que veo el perfil de otro jugador (desde el Directorio o un partido compartido), cuando toco "Marcar como frecuente", entonces queda guardado en mi lista de frecuentes (y puedo desmarcarlo de la misma forma).
- Dado que voy a invitar a alguien a uno de mis partidos, cuando abro el buscador de invitación, entonces veo primero mis jugadores frecuentes, antes de tener que escribir un nombre.

*(Origen: MEJ-008)*

### US-7.2 — Historial entre jugadores

Como jugador, quiero ver cuántas veces jugué con o contra otro jugador, para tener contexto de esa relación cuando veo su perfil.

**Criterios de aceptación:**
- Dado que compartí al menos un partido jugado (con resultado guardado) con otro jugador, cuando veo su perfil, entonces veo "Jugaste N veces con él" (mismo equipo) y/o "Jugaste N veces contra él" (equipo rival), según corresponda.
- Dado que nunca compartí un partido jugado con esa persona, cuando veo su perfil, entonces esta sección no se muestra.

*(Origen: MEJ-013, depende de US-2.7/US-2.8 ya construidas)*

### US-7.3 — Compatibilidad de duplas

Como jugador, quiero ver qué tan bien me fue jugando en pareja con cada compañero, para saber con quién formo mejor dupla.

**Criterios de aceptación:**
- Dado que jugué al menos 2 partidos en el mismo equipo que otro jugador, cuando veo su perfil, entonces veo el % de partidos ganados jugando específicamente junto a él (no su % general).
- Dado que arme un partido y necesito compañero, cuando el sistema tiene datos suficientes, entonces puede sugerirme, de forma no bloqueante, compañeros con buena compatibilidad histórica.

**Preguntas abiertas (definir en "Crear la app"):**
- ¿Cuál es el mínimo de partidos jugados juntos para que el % se considere "significativo" y se muestre (evitar un "100%" basado en un solo partido)?
- ¿La sugerencia de compañero es un cartel proactivo, o solo aparece si el jugador la busca explícitamente?

*(Origen: MEJ-020, depende de US-3.1 para tener resultados reales con qué calcularlo)*

### US-7.4 — Mensajería directa

Como jugador, quiero enviar mensajes directos a otro jugador, para coordinar detalles de un partido sin salir de la app.

**Criterios de aceptación:**
- Dado que veo el perfil de otro jugador, cuando toco "Enviar mensaje", entonces se abre (o inicia) una conversación 1 a 1 con esa persona.
- Dado que recibo un mensaje nuevo, cuando eso pasa, entonces me llega una notificación (US-3.4, mismo mecanismo de campanita).
- Dado que quiero reportar un mensaje o a un usuario, cuando lo hago, entonces queda registrado para que el superusuario (rol de US-2.9) lo pueda revisar — moderación básica, no automática.

**Preguntas abiertas (definir en "Crear la app", historia grande, requiere otra ronda de diseño antes de construir):**
- Mecanismo en tiempo real: ¿Supabase Realtime (mismo patrón que el marcador en vivo, US-2.7) o polling simple? Cambia bastante el esfuerzo.
- ¿Hay límite de longitud de mensaje o se admiten adjuntos (fotos)? El MVP de esta historia probablemente debería ser solo texto.
- ¿Qué acción concreta toma el superusuario ante un reporte (advertencia, suspensión, nada automático todavía)?

*(Origen: MEJ-021 — la historia más grande de este lote, revisar alcance antes de construir)*

### Pantallas involucradas (Épica 7)

1. **Perfil de otro jugador** (ya existente) — se le suman "Marcar como frecuente" (US-7.1), historial entre jugadores (US-7.2), % de compatibilidad de dupla (US-7.3) y "Enviar mensaje" (US-7.4).
2. **Buscador de invitación** (ya existente, US-2.3/US-3.5) — prioriza frecuentes (US-7.1).
3. **Mensajes** (US-7.4) — pantalla nueva: lista de conversaciones + vista de una conversación 1 a 1.

## Épica 8: Matchmaking Proactivo

> **Nota de priorización (2026-09-06):** a pedido del usuario, esta épica se construye **después** de las Épicas 6, 7, 9 y 10 — es la que más diseño de algoritmo nuevo requiere, con menos funcionalidad ya construida para apoyarse.

**Objetivo de negocio:** invertir el modelo de "publicar y esperar" — que la app proponga activamente con quién jugar, aprovechando datos que ya existen en `perfiles` (nivel, zona, posición) y hoy son pasivos (solo se muestran, nunca se usan para nada más).

**Roles involucrados:** Usuario común.

### US-8.1 — Declarar disponibilidad habitual y recibir sugerencias de grupo

Como jugador, quiero declarar mis días/horarios/zona habituales, para que la app me sugiera grupos de 4 compatibles en vez de tener que buscar y sumarme a un partido ya publicado.

**Criterios de aceptación:**
- Dado que declaro mi disponibilidad habitual (día de la semana, franja horaria, zona), cuando la guardo, entonces queda asociada a mi perfil.
- Dado que hay otros 3 jugadores con disponibilidad compatible (mismo día/franja/zona, nivel similar), cuando el sistema los detecta, entonces me llega una sugerencia de grupo (notificación, US-3.4).
- Dado que acepto la sugerencia, cuando todos los sugeridos también aceptan, entonces se crea un partido real con esos 4 jugadores; si alguno no acepta, el sistema sigue buscando un reemplazo compatible en vez de cancelar la sugerencia completa.

**Preguntas abiertas (definir en "Crear la app", requiere diseño de algoritmo):**
- Algoritmo de matching mínimo viable: ¿coincidencia exacta de día+franja+zona, o con algún margen de tolerancia (ej. zonas vecinas)?
- ¿Qué pasa si después de un tiempo razonable no se completan los 4 (se cancela la sugerencia, se amplía el margen de búsqueda)?

*(Origen: MEJ-018)*

### US-8.2 — Buscar compañero fijo (dupla estable)

Como jugador, quiero buscar una dupla estable, no solo gente para completar un partido puntual, para encontrar con quién jugar de forma regular.

**Criterios de aceptación:**
- Dado que activo "Buscar compañero fijo", cuando completo mi posición (drive/revés, ya en mi perfil) y zona/nivel deseados, entonces veo candidatos de la posición complementaria compatibles.
- Dado que marco interés en un candidato, cuando esa persona también marca interés en mí (match mutuo, mismo patrón que "me gusta" en otras apps), entonces quedamos vinculados como "dupla" — visible en ambos perfiles.
- Dado que ya tengo una dupla vinculada, cuando arme un partido, entonces puedo invitarla directamente con un acceso rápido (reutiliza el mecanismo de US-2.3).

**Preguntas abiertas (definir en "Crear la app"):**
- ¿Puedo tener más de una dupla vinculada a la vez, o es de a una?
- ¿"Desvincular" una dupla requiere confirmación de ambos, o cualquiera de los dos puede hacerlo unilateralmente?

*(Origen: MEJ-019)*

### Pantallas involucradas (Épica 8)

1. **Mi disponibilidad habitual** (US-8.1) — formulario en el perfil: días, franjas horarias, zona.
2. **Sugerencias de grupo** (US-8.1) — notificación + pantalla de aceptar/rechazar una sugerencia.
3. **Buscar compañero fijo** (US-8.2) — pantalla nueva: candidatos compatibles, marcar interés, ver duplas vinculadas.

## Épica 9: Mejoras al Directorio de Canchas

**Objetivo de negocio:** darle más vida al Directorio de Canchas (Épica 4), que hoy es un listado estático cargado por seed/SQL directo.

**Roles involucrados:** Usuario común (reseñas), superusuario (panel de administración — mismo rol de US-2.9, no uno nuevo).

### US-9.1 — Reseñas y puntuación de canchas

Como jugador, quiero dejar una puntuación y un comentario sobre una cancha donde jugué, para ayudar a otros a elegir dónde jugar.

**Criterios de aceptación:**
- Dado que jugué un partido (con resultado guardado, US-2.7/US-2.8) en una cancha que coincide con una del Directorio, cuando entro a su detalle, entonces puedo dejar una puntuación (1 a 5) y un comentario opcional.
- Dado que veo el detalle de una cancha, cuando la pantalla carga, entonces veo su puntuación promedio y las reseñas de otros jugadores (nombre + puntuación + comentario).
- Dado que intento puntuar una cancha donde nunca jugué, cuando lo intento, entonces el sistema no me lo permite — evita reseñas falsas de canchas donde nunca estuve.

**Preguntas abiertas (definir en "Crear la app"):**
- ~~El match entre "cancha del partido" y "cancha del Directorio" hoy es por nombre exacto (ver BUG-012, resuelto así por decisión de no migrar a una relación por id) — ¿esta historia es la oportunidad de pasar a una relación real (`cancha_id`), o se mantiene el mismo criterio heurístico?~~ **Resuelto (2026-09-13, ver US-4.3):** sí, se pasó a una relación real — `partidos.cancha_id` (FK nullable a `canchas`), completada al elegir la cancha del autocompletado al crear el partido. El match heurístico por nombre queda solo como respaldo para partidos sin `cancha_id` cargado (viejos, o creados con texto libre que no coincidió con ninguna fila real).

*(Origen: MEJ-014)*

### US-9.2 — Panel de administración de canchas

Como superusuario, quiero dar de alta y editar canchas desde una pantalla simple, para no tener que escribir SQL a mano cada vez que se agrega o corrige una.

**Criterios de aceptación:**
- Dado que soy superusuario (`es_superusuario`, rol de US-2.9), cuando entro al panel de canchas, entonces puedo crear una cancha nueva o editar una existente (nombre, dirección, zona, teléfono, descripción, valores, provincia).
- Dado que guardo los cambios, cuando lo hago, entonces se reflejan inmediatamente en el Directorio de Canchas para todos los jugadores.
- Dado que no soy superusuario, cuando intento acceder a este panel (por UI o manipulando la URL/API), entonces el sistema lo rechaza — mismo criterio de autorización que ya protege `resolver_apelacion` (US-2.9).

*(Origen: MEJ-015, reutiliza el rol de superusuario ya construido)*

### Pantallas involucradas (Épica 9)

1. **Detalle de cancha** (ya existente) — se le suma la sección de reseñas y el formulario para dejar la propia (US-9.1).
2. **Panel de administración de canchas** (US-9.2) — pantalla nueva, solo accesible para superusuario: listado editable + formulario de alta/edición.

## Épica 10: Economía del Partido

**Objetivo de negocio:** resolver un problema real de coordinación de grupo (dividir el costo de la cancha) sin meterse con pagos reales ni integraciones de medios de pago.

**Roles involucrados:** Usuario común.

### US-10.1 — Calculadora de gastos del partido

Como organizador, quiero calcular cuánto le toca pagar a cada jugador por la cancha, para no tener que hacer la cuenta a mano ni discutir montos.

**Criterios de aceptación:**
- Dado que estoy en el detalle de mi partido, cuando cargo cuánto gastó cada persona (nombre libre, opcionalmente vinculado a una cuenta real de la app), entonces el sistema calcula el saldo de cada uno (lo que puso menos su parte proporcional) y arma la lista de "quién le debe a quién y cuánto" hasta saldar todo.
- Dado que hay jugadores confirmados, cuando veo la calculadora, entonces todos los participantes del partido pueden ver el desglose (no solo el organizador).
- Dado que un gasto quedó vinculado a una cuenta real, cuando el organizador guarda los gastos, entonces esa persona recibe una notificación con su saldo neto ("te deben $X" / "debés $X"), sin necesidad de entrar al partido para enterarse.
- **Decisión (2026-09-06, alcance explícito):** esto es **solo informativo** — no procesa ningún pago real, no integra Mercado Pago ni ningún medio de pago, no queda registro de quién efectivamente pagó. Es una calculadora, no un sistema de cobros.

**Nota (2026-09-06, rediseño a pedido del usuario):** el criterio original de esta historia dividía el costo total en partes iguales entre la cantidad de jugadores *confirmados* del partido ("total ÷ confirmados"). Se reemplazó por un esquema estilo Splitwise: cada persona carga cuánto gastó realmente (no necesariamente todos gastan lo mismo, ni todos los que gastaron son necesariamente jugadores confirmados — puede incluir invitados sin cuenta), y el sistema calcula los saldos y empareja deudores con acreedores. La división en partes iguales sigue existiendo, pero es "total ÷ cantidad de personas que cargaron un gasto", no "÷ confirmados". Verificado en la ronda de pruebas de la Épica 10 (2026-09-07): sin bugs encontrados.

*(Origen: MEJ-009)*

### Pantallas involucradas (Épica 10)

1. **Detalle de partido** (ya existente) — se le suma la calculadora de gastos (US-10.1), visible para todos los participantes.

---

**Con estas 5 épicas (6 a 10, 18 historias de usuario) se completa la conversión del backlog de mejoras post-MVP en historias formales.** Orden de construcción decidido: Épicas 6, 7, 9 y 10 primero; Épica 8 al final. Quedan fuera de este documento, por no ser historias de usuario de la app: MEJ-001 y MEJ-022 (tareas de pulido/spike sueltas) y MEJ-016/MEJ-017 (infraestructura de testing, a cargo de "Automatización").
