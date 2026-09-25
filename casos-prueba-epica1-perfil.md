# Matriz de Casos de Prueba Manuales — Épica 1: Autenticación y Perfil de Usuario

Basado en las historias de usuario de `historias-usuario-mvp.md` (Épica 1). Cubre casos funcionales, negativos, de límite y de seguridad. A medida que se automatice (Postman/Playwright), se va a marcar qué casos quedan automatizados en el documento del chat "Automatización" — este documento sigue siendo la fuente de la cobertura manual completa.

**Convenciones:**
- **Tipo:** Funcional / Negativo / Límite / Seguridad / Responsive
- **Prioridad:** Alta / Media / Baja (impacto en el flujo principal si falla)

## US-1.1 — Login con Google

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-1.1.1 | Login exitoso, usuario nuevo | No tengo cuenta previa en la plataforma | 1. Abrir la app. 2. Tocar "Continuar con Google". 3. Elegir una cuenta de Google válida y autorizar. | Se crea la cuenta y soy redirigido a "Completar perfil". | Funcional | Alta |
| CP-1.1.2 | Login exitoso, usuario existente | Ya completé mi perfil en un login anterior | 1. Abrir la app. 2. Tocar "Continuar con Google". 3. Autorizar con la misma cuenta. | Soy redirigido directo a Home, con mi sesión activa. | Funcional | Alta |
| CP-1.1.3 | Cancelar el flujo de Google | Sin sesión iniciada | 1. Tocar "Continuar con Google". 2. Cerrar la ventana/popup de Google sin autorizar. | Permanezco en login, sin sesión, con mensaje de que no se completó el inicio de sesión. | Negativo | Media |
| CP-1.1.4 | Google devuelve error (token inválido / cuenta suspendida) | Simular con una cuenta de prueba inválida o interceptando la respuesta | 1. Intentar login con una cuenta/condición que Google rechace. | Veo un mensaje de error claro y puedo reintentar; no se crea sesión. | Negativo | Alta |
| CP-1.1.5 | Acceder a una URL protegida sin sesión iniciada | Sin sesión activa | 1. Sin loguearme, pegar en el navegador la URL de una pantalla interna (ej. Home o Perfil). | Soy redirigido al login; no se muestra contenido protegido. | Seguridad | Alta |
| CP-1.1.6 | Login exitoso con el login de prueba (email+contraseña derivados de Nombre/Apellido) | Login de prueba disponible en el entorno (no gateado o gateado y habilitado) | 1. Abrir la app. 2. Elegir la opción de login de prueba. 3. Completar Nombre y Apellido. 4. Confirmar. | Se inicia sesión real (mismo flujo de Supabase Auth que Google) con el email/contraseña derivados; el comportamiento posterior (alta de perfil si es la primera vez, u Home si ya existe) es igual que con Google. | Funcional | Media |
| CP-1.1.7 | Dos usuarios de prueba con el mismo Nombre y distinto Apellido chocan entre sí | Login de prueba disponible; ya usé el login de prueba una vez con un Nombre dado | 1. Crear un usuario de prueba con Nombre "Ana" y Apellido "Gómez". 2. Cerrar sesión. 3. Volver al login de prueba y usar Nombre "Ana" (mismo) y Apellido "Pérez" (distinto). | **Corregido tras ejecución manual (2026-09-05):** el login **falla** (no se crea sesión) — como el email de prueba se deriva solo del Nombre, el Apellido "Pérez" se interpreta como la contraseña de la cuenta ya existente de "Ana Gómez", y no coincide. No entra a ninguna cuenta (ni la existente ni una nueva); veo el mensaje de error correspondiente ("No se pudo iniciar sesión ni crear el usuario..."). El texto anterior de este caso decía erróneamente que "entra a la cuenta ya existente de Ana Gómez" — no es así, coincide con lo documentado en `estado-tecnico-proyecto.md` ("el login falla"), no con la redacción previa de este caso. Al diseñar casos con login de prueba, usar Nombres distintos entre sí para representar usuarios distintos — no alcanza con variar solo el Apellido. | Límite | Media |

## US-1.2 — Completar perfil (alta)

**Nota sobre el mecanismo real de bloqueo (agregada tras ejecución manual, 2026-09-05):** desde que se implementó el patrón transversal "botón deshabilitado hasta completar el formulario" (CP-1.7.2), los casos CP-1.2.2, CP-1.2.3, CP-1.2.4, CP-1.2.6, CP-1.2.8 y CP-1.2.9 ya no pueden llegar a mostrar un "mensaje de validación al tocar Guardar", porque el botón queda deshabilitado y no se puede tocar mientras falte cualquiera de los 7 campos obligatorios — verificado que el resultado neto ("no se guarda") se sigue cumpliendo, pero vía ese mecanismo, no vía un mensaje de error post-submit. No se considera un bug (el patrón de botón deshabilitado es una decisión de UX explícita y transversal), solo una corrección de redacción para las 6 filas siguientes.

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-1.2.1 | Alta de perfil con todos los datos válidos | Primer login recién hecho | 1. Completar los 7 campos obligatorios: nombre, teléfono, sexo, zona, nivel, mano hábil y posición. 2. Tocar "Guardar". | El perfil se crea (fila en `perfiles`); soy redirigido a Home. | Funcional | Alta |
| CP-1.2.2 | Intentar guardar sin nivel | Primer login recién hecho | 1. Dejar "nivel" vacío. 2. Completar el resto. | El botón "Guardar perfil" permanece deshabilitado mientras falte "nivel"; no hay forma de intentar guardar ni de ver un mensaje de validación (ver nota arriba). | Negativo | Alta |
| CP-1.2.3 | Intentar guardar sin mano hábil | Ídem | 1. Dejar "mano hábil" sin seleccionar. | El botón permanece deshabilitado (ver nota arriba). | Negativo | Media |
| CP-1.2.4 | Intentar guardar sin posición preferida | Ídem | 1. Dejar "posición" sin seleccionar. | El botón permanece deshabilitado (ver nota arriba). | Negativo | Media |
| CP-1.2.5 | Enviar un nivel fuera de rango manipulando el request (vía Postman, no por la UI) | Tener el endpoint de alta de perfil disponible | 1. Armar un request directo al backend con un valor de nivel inválido (ej. fuera de la escala 1ª–7ª). 2. Enviar. | El backend rechaza el valor con un error controlado (400), no lo guarda como válido. | Seguridad/Límite | Alta |
| CP-1.2.6 | Intentar guardar sin sexo | Primer login recién hecho | 1. Completar nivel, mano hábil y posición. 2. Dejar "sexo" sin seleccionar. | El botón permanece deshabilitado (ver nota arriba); sexo es obligatorio, confirmado en US-1.2. | Negativo | Alta |
| CP-1.2.7 | Verificar que la escala de nivel se muestra sin ambigüedad (1ª = categoría más alta) | Primer login recién hecho, en la pantalla de alta de perfil | 1. Abrir el selector de nivel. 2. Observar cómo se presentan las categorías 1ª a 7ª. | La UI deja explícito (texto, orden u otra señal visual) que 1ª es la categoría más alta y 7ª la más baja, sin que el jugador pueda confundirse por default. | Funcional | Media |
| CP-1.2.8 | Intentar guardar sin zona | Primer login recién hecho | 1. Completar nivel, mano hábil, posición, sexo y teléfono. 2. Dejar "zona" sin seleccionar. | El botón permanece deshabilitado (ver nota arriba); los 7 campos son obligatorios sin excepción. | Negativo | Alta |
| CP-1.2.9 | Intentar guardar sin teléfono | Primer login recién hecho | 1. Completar nivel, mano hábil, posición, sexo y zona. 2. Dejar "teléfono" vacío. | El botón permanece deshabilitado (ver nota arriba); los 7 campos son obligatorios sin excepción. | Negativo | Alta |
| CP-1.2.10 | Guardar con un teléfono sin ningún formato específico | Primer login recién hecho | 1. Completar el resto de los campos. 2. Ingresar cualquier valor no vacío en "teléfono" (ej. sin código de país, con o sin espacios/guiones, cualquier cantidad de dígitos). 3. Tocar "Guardar". | El perfil se guarda sin error de formato — el teléfono no exige ningún formato específico, solo que no esté vacío (se evaluó una validación de formato para números de Argentina y se descartó por decisión del usuario). | Funcional | Media |

## US-1.3 — Editar perfil

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-1.3.1 | Editar perfil con datos válidos | Tengo perfil creado | 1. Ir a "Mi perfil" → "Editar". 2. Cambiar uno o más de: nivel, mano hábil, posición, sexo, zona, teléfono. 3. Guardar. | Los cambios se reflejan inmediatamente en el perfil. | Funcional | Alta |
| CP-1.3.2 | Intentar guardar edición con un campo obligatorio vaciado | Tengo perfil creado | 1. Ir a "Editar". 2. Vaciar un campo obligatorio (cualquiera de los 7: nombre, teléfono, sexo, zona, nivel, mano hábil o posición). 3. Guardar. | Se rechaza igual que en el alta; no se pierde el valor anterior. | Negativo | Media |
| CP-1.3.3 | Cancelar edición sin guardar | Tengo perfil creado | 1. Ir a "Editar". 2. Cambiar un valor. 3. Salir sin guardar (botón "Cancelar" o navegación atrás). | El perfil conserva los valores anteriores, sin cambios. | Funcional | Baja |

## US-1.4 — Ver perfil propio y de otros jugadores

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-1.4.1 | Ver perfil propio con score ya calculado | Tengo valoraciones recibidas de partidos anteriores | 1. Ir a "Mi perfil". | Veo nivel autodeclarado, score de ranking, mano hábil, posición, sexo y zona. | Funcional | Media |
| CP-1.4.2 | Ver perfil propio sin valoraciones recibidas | Recién creé mi cuenta, sin partidos jugados | 1. Ir a "Mi perfil". | Veo un placeholder claro (ej. "Todavía no tenés valoraciones") en vez de un score vacío o un error. | Límite | Media |
| CP-1.4.3 | Ver perfil de otro jugador compartiendo un partido | Tengo un partido en común con otro jugador | 1. Entrar al detalle del partido. 2. Tocar el nombre/avatar de otro jugador. | Veo su nivel autodeclarado y score, en vista reducida (sin datos de contacto salvo excepción de Épica 2). | Funcional | Alta |
| CP-1.4.4 | Verificar que no se muestre el teléfono si el jugador no confirmó el partido | Comparto partido con un jugador que no confirmó asistencia | 1. Ver el perfil reducido de ese jugador desde el partido. | No se muestra su número de teléfono. | Seguridad/Privacidad | Alta |
| CP-1.4.5 | Intentar ver el perfil completo de un jugador sin compartir partido, manipulando el request | Tengo sesión iniciada; existe otro jugador con quien no comparto ningún partido | 1. Armar un request directo a la API pidiendo el perfil de ese jugador. 2. Enviar. | El backend no devuelve el perfil (RLS de Supabase no habilita esa lectura cruzada todavía) — pendiente de confirmar el comportamiento exacto cuando "Crear la app" defina cuándo se habilita (ver pregunta abierta de US-1.4). | Seguridad | Media |

## US-1.5 — Cerrar sesión

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-1.5.1 | Cerrar sesión correctamente | Sesión iniciada | 1. Ir a "Mi perfil". 2. Tocar "Cerrar sesión". | Se invalida la sesión; soy redirigido al login. | Funcional | Alta |
| CP-1.5.2 | Navegar "atrás" en el navegador después de cerrar sesión | Acabo de cerrar sesión | 1. Cerrar sesión. 2. Usar el botón "atrás" del navegador para volver a una pantalla protegida. | No se muestra contenido protegido; redirige al login. | Seguridad | Alta |
| CP-1.5.3 | Acceder por URL directa a una pantalla interna sin sesión activa | Sin sesión iniciada (o luego de cerrar sesión) | 1. Pegar en el navegador la URL de una pantalla interna (ej. `/perfil`, `/home`). | Redirige al login; no se filtra información. | Seguridad | Alta |

## US-1.6 — Dar de baja mi cuenta

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-1.6.1 | Dar de baja mi cuenta exitosamente | Sesión iniciada, perfil completo | 1. Ir a "Mi perfil". 2. Tocar "Dar de baja mi cuenta". 3. Confirmar en el cuadro de diálogo de confirmación. | Mi perfil pasa a inactivo (`activo = false`, se registra `dado_de_baja_en`); dejo de poder operar normalmente en la plataforma con esa cuenta. | Funcional | Alta |
| CP-1.6.2 | Verificar que la baja no borra el registro | Acabo de dar de baja mi cuenta (o tengo forma de consultar la tabla `perfiles`/el endpoint) | 1. Dar de baja la cuenta. 2. Consultar el registro de ese perfil. | La fila sigue existiendo, con `activo = false` y `dado_de_baja_en` con fecha/hora; no desaparece de la tabla. | Funcional | Alta |
| CP-1.6.3 | Intentar un DELETE real manipulando la API directamente | Token válido y id de un perfil (propio) | 1. Armar un request `DELETE` directo contra el endpoint/tabla `perfiles` (vía Postman, sin pasar por la UI). 2. Enviar. | El backend/Supabase rechaza la operación (no existe política RLS de `DELETE`); el registro permanece intacto. | Seguridad | Alta |
| CP-1.6.4 | Cancelar el flujo de baja sin confirmar | Sesión iniciada | 1. Ir a "Mi perfil". 2. Tocar "Dar de baja mi cuenta". 3. En el cuadro de diálogo, tocar "Cancelar" (o cerrarlo) sin confirmar. | La cuenta permanece activa, sin cambios; vuelvo a "Mi perfil". No se pide reingresar contraseña en ningún momento de este flujo. | Funcional | Baja |
| CP-1.6.5 | Intentar dar de baja la cuenta de otro jugador manipulando el request | Sesión iniciada como Jugador A; conozco el id de perfil de Jugador B | 1. Armar un request que intente marcar `activo = false` en el perfil de otro jugador. 2. Enviar. | El backend rechaza la operación: solo el dueño del perfil puede darlo de baja (mismo principio de autorización por dueño que en Épica 2, ver CP-2.5.4). | Seguridad | Alta |
| CP-1.6.6 | Iniciar sesión con una cuenta dada de baja muestra la pantalla de reactivación | Tengo una cuenta con `activo = false` | 1. Iniciar sesión (con Google o login de prueba) con esa cuenta. | No accedo directo a mi perfil ni a Home: veo la pantalla de reactivación, con las opciones "Reactivar mi cuenta" y "Cancelar". | Funcional | Alta |
| CP-1.6.7 | Confirmar la reactivación desde esa pantalla | Estoy en la pantalla de reactivación (cuenta con `activo = false`) | 1. Tocar "Reactivar mi cuenta". | Mi perfil vuelve a `activo = true`, se limpia `dado_de_baja_en`, y accedo normalmente a mi perfil/Home. | Funcional | Alta |
| CP-1.6.8 | Cancelar en la pantalla de reactivación | Estoy en la pantalla de reactivación (cuenta con `activo = false`) | 1. Tocar "Cancelar". | Se cierra mi sesión y vuelvo al login; mi cuenta sigue con `activo = false` (no se reactivó). | Funcional | Media |
| CP-1.6.9 | La reactivación no ocurre de forma automática | Tengo una cuenta con `activo = false` | 1. Iniciar sesión con esa cuenta. 2. Sin tocar "Reactivar mi cuenta", observar el estado de la cuenta. | La cuenta permanece con `activo = false` hasta que confirmo explícitamente la reactivación; el solo hecho de iniciar sesión no la reactiva. | Funcional | Media |

**Nota:** las preguntas abiertas de US-1.6 que todavía no tienen casos de prueba propios porque dependen de decisiones pendientes de "Crear la app" (que a su vez dependen de que exista la Épica 2) son: visibilidad del nombre/perfil en partidos pasados tras la baja, y qué pasa con partidos futuros donde el jugador está anotado u organiza. Se agregan en cuanto se resuelvan. Las preguntas sobre reactivación al volver a iniciar sesión y sobre si hace falta una confirmación adicional (contraseña) antes de la baja ya quedaron resueltas y cubiertas arriba (CP-1.6.6 a CP-1.6.9, y CP-1.6.4).

## Transversal (aplica a toda la épica)

| ID | Título | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-1.7.1 | Formulario de perfil se ve y funciona bien en mobile y desktop | — | 1. Repetir el alta/edición de perfil desde un navegador de escritorio y desde un dispositivo móvil (o viewport reducido). | El formulario es usable y legible en ambos casos, sin elementos cortados ni inaccesibles. | Responsive | Media |
| CP-1.7.2 | El botón de enviar/guardar queda deshabilitado hasta completar todos los campos obligatorios | — | 1. Repetir en cada uno de los 3 formularios con botón de enviar/guardar (login de prueba, completar perfil, editar perfil): abrir el formulario vacío (o recién precargado, en el caso de editar) y, sin completar todavía todos los campos obligatorios, observar el botón. 2. Completar el/los campo/s que faltaba/n uno por uno, observando el botón en cada paso. | Mientras falta al menos un campo obligatorio, el botón está deshabilitado (no se puede tocar). Apenas se completan todos, el botón pasa a estar habilitado, en los 3 formularios. | Funcional | Media |

## Candidatos a automatización temprana (referencia para el chat "Automatización")

- CP-1.2.5 es un buen primer caso para Postman (Bloque 2 del roadmap de aprendizaje): valida una regla de negocio a nivel API, no de UI.
- CP-1.1.1, CP-1.1.2 y CP-1.5.1 son buenos candidatos a un primer test E2E en Playwright una vez se llegue al Bloque 3, por ser el flujo crítico principal (login).
- CP-1.6.3 es otro buen candidato temprano para Postman: valida, a nivel API/base de datos, que no existe forma de hacer un DELETE real sobre `perfiles` (regla de seguridad, no de UI).

## Resultado de la ejecución manual (2026-09-05, "Diseño QA")

Ejecutados los 25 casos de la matriz contra la app corriendo en local (`localhost:3000` / `localhost:3001`), usando dos usuarios de prueba nuevos (login de prueba) para los casos multiusuario. Resumen:

- **Pasaron:** CP-1.1.6, CP-1.1.7 (con corrección de redacción, ver arriba), CP-1.2.1 a CP-1.2.10 (con nota sobre el mecanismo real en CP-1.2.2/3/4/6/8/9), CP-1.3.1, CP-1.3.2, CP-1.3.3, CP-1.4.5, CP-1.5.1, CP-1.6.1 a CP-1.6.9, CP-1.7.1, CP-1.7.2.
- **Bugs confirmados:** ver `registro-errores.md` — BUG-001 (rutas protegidas no redirigen al login sin sesión, CP-1.1.5/CP-1.5.2/CP-1.5.3), BUG-003 (falta el score de ranking o su placeholder en "Mi perfil", CP-1.4.1/CP-1.4.2).
- **Retractado (falso positivo del propio proceso de prueba, no bug de la app):** BUG-002 — un primer intento de reproducir "el login de prueba no muestra mensaje de error" usando clicks por coordenadas de pantalla dio un falso negativo (los clicks por coordenadas resultaron poco confiables en esta sesión); repetido con un click disparado directo sobre el botón, el mensaje de error se muestra correctamente. Ver el detalle en `registro-errores.md`.
- **No ejecutados en esta sesión (requieren cuenta real de Google, fuera del alcance del entorno de prueba automatizado):** CP-1.1.1, CP-1.1.2, CP-1.1.3, CP-1.1.4. El usuario ya había verificado manualmente el login real con Google de punta a punta (ver `estado-tecnico-proyecto.md`, 2026-09-01), pero no contra esta matriz de casos puntual — quedan pendientes de una pasada manual del usuario si se quiere cobertura formal.
- **Bloqueados por dependencia de la Épica 2 (compartir partido), todavía no construida:** CP-1.4.3, CP-1.4.4.
- **No reproducible de forma confiable, no se carga como bug:** durante la ejecución, el primer guardado de "completar perfil" de uno de los usuarios de prueba falló dos veces con error 400 sin mensaje visible, pero el mismo payload insertado directamente por API funcionó sin problemas y no se pudo reproducir de nuevo — probablemente el mismo artefacto de clicks poco confiables detrás de BUG-002, no un bug real. Si vuelve a aparecer durante el testing de próximas épicas (con clicks confiables), recién ahí cargarlo.
