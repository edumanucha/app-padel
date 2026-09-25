# Proyecto QA Automation — App de Padel

## Documento maestro de alcance y configuración

Este documento sirve de base para crear el Proyecto en la app de Claude (cuenta laboral, uso enmarcado como capacitación técnica/upskilling). Contiene el alcance definido, el stack, las buenas prácticas y el roadmap de fases.

---

## 🎯 Objetivo del proyecto

Practicar y demostrar habilidades de QA Automation (Postman, Playwright, diseño de casos de prueba) sobre una aplicación real y funcional, desarrollada de punta a punta, en lugar de un proyecto ficticio o de documentación únicamente.

**Nota de encuadre:** dentro de la cuenta laboral, este proyecto se presenta y se trabaja como capacitación técnica / upskilling en testing automatizado — sin referencias a búsqueda laboral, portafolio para reclutadores o cambio de trabajo (eso se gestiona aparte, en cuenta personal).

---

## 🎾 Idea del producto

Una aplicación web para organizar partidos de padel entre jugadores reales, con sistema de valoración entre pares que arma un ranking/score de nivel.

---

## 📋 Alcance MVP (Fase 1)

### Roles
- **Admin**: gestión general de la plataforma
- **Usuario común**: jugador de padel

### Funcionalidades incluidas
1. **Registro / perfil de usuario**
   - Login con Google (OAuth 2.0)
   - Nivel autodeclarado al crear el perfil
   - Mano hábil y posición preferida (drive/revés) — dato relevante en padel

2. **Gestión de partidos**
   - Crear partido
   - Invitar jugadores / sumarse a un partido existente (no solo crear el propio)
   - Confirmar asistencia
   - Estado del partido: abierto / completo / cancelado / jugado

3. **Sistema de valoración entre jugadores → Ranking/Score**
   - Después de un partido, los jugadores pueden valorar el nivel de los demás (ej: "Pedro juega como séptima categoría")
   - El conjunto de valoraciones recibidas arma un score
   - Ese score se compara contra el nivel autodeclarado por el propio usuario

4. **Directorio de canchas**
   - Listado estático de canchas (sin sistema de reservas todavía)
   - Descripción, valores, número de teléfono de contacto

5. **Funcionalidades "en construcción" visibles**
   - Ítems de menú visibles pero bloqueados (badge "Próximamente") para las features de fases futuras
   - Verificar en testing que lo bloqueado no sea accesible manipulando la URL directamente

### Requisitos técnicos transversales
- **Responsive**: acceso completo desde computadora y celular
- **Base de datos real** (no mock data)
- **Seguridad y privacidad desde el diseño** (ver sección dedicada)

---

## 🗺️ Roadmap de fases futuras (documentado, no implementado aún)

### Fase 2
- Rol adicional: "dueño de cancha"
- Sistema de turnos/agenda real sobre las canchas (booking)

### Fase 3
- Carga manual de estadísticas de partido (errores de drive, aces, etc.)
- Reportes/gráficos sobre esas estadísticas
- Historial de partidos jugados por usuario
- Jugadores frecuentes/favoritos
- División automática de gastos de cancha entre jugadores
- Notificaciones (recordatorio de partido, cambios de estado, nueva valoración recibida)
- Filtros de búsqueda de partidos abiertos (zona, nivel, horario)

### Fase 4 — Mejora: offline-first / PWA
- Convertir la web en Progressive Web App
- Sesión persistente vía token con expiración (no contraseña guardada localmente)
- Modo con funcionalidades limitadas sin conexión (ver datos ya cacheados: perfil, últimos partidos)
- Sincronización diferida de acciones al recuperar señal (ej: confirmar asistencia offline y sincronizar después)
- Testing de casos de conflicto (ej: dos usuarios compiten por el último lugar de un partido mientras uno estaba offline)

### Fase 5 (visión a futuro, fuera del alcance de este portafolio)
- Acceso a cámara para cargar evidencia manual (fotos/video de resultados)
- Conteo automático de puntos y detección de jugadas (errores de drive, etc.) mediante visión por computadora — proyecto de IA independiente, no forma parte de este desarrollo

### Fase futura — Pagos (cuando exista booking de canchas)
- Nunca manejar datos de tarjeta directamente
- Integrar proveedor certificado (Mercado Pago o Stripe) — la información sensible no pasa por el servidor propio

---

## 🛠️ Stack tecnológico (100% gratuito)

| Componente | Herramienta | Notas |
|---|---|---|
| Frontend | React / Next.js | Resuelve responsive y estructura de rutas |
| Backend | Node.js + Express (API REST) | Ideal para practicar Postman |
| Base de datos | PostgreSQL (via Supabase o Neon) | Plan free con espacio de sobra; Supabase suma storage y auth listos para usar |
| Hosting frontend | Vercel | Plan gratuito, HTTPS incluido |
| Hosting backend | Render | Plan free (el servicio "duerme" tras inactividad — aceptable para portafolio) |
| Repositorio | GitHub | Público, para mostrar el código |
| CI/CD (opcional) | GitHub Actions | Minutos gratis incluidos, para correr tests automáticos |

---

## 🔒 Seguridad y privacidad (desde el diseño, no como parche)

- Autenticación vía OAuth (Google) — evita manejar contraseñas propias
- Autorización por rol: verificar que un usuario común no acceda a endpoints de admin manipulando la API directamente
- Validación de inputs en frontend **y** backend
- HTTPS en todos los entornos (por defecto en Vercel/Render)
- Variables de entorno para credenciales — nunca hardcodeadas en el código
- Revisar qué datos personales se muestran públicamente (ej: teléfono de un jugador solo visible si confirmó el partido)
- Pagos (cuando aplique): delegados 100% a proveedor certificado, nunca se procesan datos de tarjeta en servidor propio

---

## 🔄 Metodología de trabajo para el chat "Crear la app"

- **Desarrollo guiado y explicado**: en cada paso, explicar qué se está haciendo y por qué (la decisión técnica detrás), no solo entregar código. Incluir recomendaciones alternativas cuando sea relevante.
- **Iterativo**: construir por entregas pequeñas, no todo de una vez — cada entrega debe ser algo funcional y acotado (ej: "login funcionando", "alta de partido funcionando"), no código a medio terminar.
- **Testing después de cada entrega**: al cerrar cada entrega/incremento, probarla antes de avanzar a la siguiente:
  - Pruebas manuales sobre lo nuevo
  - Ir sumando de a poco pruebas automatizadas (Postman/Playwright) a medida que se avanza en el aprendizaje de esas herramientas, en lugar de dejar toda la automatización para el final
- **Documentación continua**, generada a la par del desarrollo (no al final del proyecto):
  - **Documentación funcional**: qué hace cada funcionalidad, historias de usuario, criterios de aceptación
  - **Documentación técnica**: arquitectura, decisiones de stack, estructura de carpetas, cómo levantar el proyecto localmente
  - **Documentación de pruebas**: casos de prueba manuales diseñados, y a la par, qué se automatizó y cómo (scripts de Postman, tests de Playwright)

---

## 💬 Estructura de chats dentro del Proyecto en Claude

1. **Crear la app** — desarrollo del código (frontend + backend + base de datos)
2. **Aprender conceptos** — espacio didáctico: teoría de testing de API, Playwright, Page Object Model, explicado paso a paso
3. **Diseño QA** — historias de usuario + matriz de casos de prueba manuales sobre la app ya construida
4. **Automatización** — scripts de Postman y Playwright ejecutándose contra la app real
5. **Web de presentación personal** — sitio propio para contar quién sos y qué hacés, mostrar proyectos (incluyendo el de padel una vez publicado), y un espacio para poder probar/demostrar lo que hacés. Pensado escalable, para ir sumando proyectos futuros sin rehacer la base.

---

## 📝 Instrucciones sugeridas para el Proyecto en Claude

> Sos mi mentor técnico senior en desarrollo y QA Automation. Tengo experiencia sólida en testing manual (diseño de casos de prueba, análisis de requerimientos, reporte de bugs) y estoy aprendiendo desde cero: JavaScript, desarrollo full-stack (React/Next.js + Node/Express + PostgreSQL), pruebas de API con Postman, y automatización web con Playwright. Explicá siempre el "por qué" técnico además del "cómo", y recomendá alternativas cuando sea relevante. Trabajemos de forma iterativa: entregas pequeñas y funcionales, no todo de una vez. Después de cada entrega, probemos lo nuevo (manualmente y, a medida que avancemos, con pruebas automatizadas) antes de seguir con lo siguiente. Generá documentación a la par del desarrollo, no al final: funcional (qué hace cada feature, historias de usuario), técnica (arquitectura, decisiones de stack, cómo correr el proyecto) y de pruebas (casos manuales diseñados y qué se automatizó). Cuando me des código, hacelo paso a paso, sin tirarme la solución completa de una — quiero entender cada parte antes de avanzar a la siguiente. Priorizá buenas prácticas, seguridad y privacidad desde el diseño, y patrones modernos como Page Object Model (POM) para la automatización.

---

## ✅ Próximo paso

Con este alcance cerrado, el siguiente paso es redactar las historias de usuario de la Fase 1 (MVP) con sus criterios de aceptación, y armar un cronograma realista de sprints/reuniones para ir documentando el avance del proyecto.
