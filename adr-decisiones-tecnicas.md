# ADR — Registro de Decisiones Técnicas (Architecture Decision Records)

Documento del chat "Crear la app" para registrar decisiones técnicas concretas de código a medida que se toman — no decisiones de alcance/producto (esas van en `proyecto-padel-qa-alcance.md`) ni de metodología de trabajo entre chats (esas van en `tablero-proyecto.md`). Se creó recién cuando surgió la primera decisión real (ver `estado-tecnico-proyecto.md`, sección 7, para el porqué de no crearlo antes).

**Formato por entrada:** título, fecha, estado (Aceptada / Reemplazada por ADR-XXX), contexto, decisión, alternativas consideradas y por qué se descartaron, consecuencias (positivas y negativas/trade-offs asumidos).

---

## ADR-001 — Proveedor de base de datos: Supabase

**Fecha:** 2026-08-29
**Estado:** Aceptada

### Contexto

El alcance del proyecto (`proyecto-padel-qa-alcance.md`) pedía PostgreSQL real, dejando abierto el proveedor entre Supabase o Neon (ambos con plan gratuito suficiente). La Épica 1 del MVP (Autenticación y Perfil) requiere login con Google vía OAuth 2.0 como primer flujo a construir.

### Decisión

Se usa **Supabase** como proveedor de base de datos y autenticación.

### Alternativas consideradas

- **Neon:** Postgres puro, sin extras. Se descartó como primera opción porque hubiera requerido implementar el flujo de OAuth con Google a mano (por ejemplo con Passport.js) desde cero: más control y más aprendizaje manual de autenticación, pero más trabajo para llegar al mismo resultado en la Épica 1.
- **Supabase (elegida):** Postgres real debajo (no es una base de datos propietaria distinta), más Auth ya integrado — soporta login con Google out-of-the-box.

### Consecuencias

- El backend en Express no va a implementar el flujo OAuth completo a mano; va a integrarse contra Supabase Auth (verificar el token/sesión que Supabase emite).
- Se gana velocidad para llegar a la Épica 1 funcional, a costa de menos práctica manual de "cómo se arma un OAuth desde cero" — trade-off aceptado explícitamente porque no es el foco de aprendizaje de este proyecto (el foco es QA Automation; el desarrollo full-stack es el vehículo).
- Acoplamos parte de la autenticación a un servicio externo (Supabase). Si más adelante se quisiera migrar a Neon u otro Postgres puro, habría que reemplazar la capa de Auth — impacto documentado acá para cuando se evalúe.
- Próximo paso operativo: crear el proyecto en supabase.com y guardar la cadena de conexión / claves en un `.env` local (nunca committeado), documentado en `estado-tecnico-proyecto.md` sección 6 una vez hecho.
