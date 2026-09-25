# Roadmap de aprendizaje — Chat "Aprender conceptos"

Roadmap de contenidos para el chat didáctico de QA Automation, en paralelo al desarrollo de la app de padel (chat "Crear la app"). Vamos bloque por bloque, con ejercicios prácticos en cada uno, no solo teoría. Cuando existan funcionalidades reales de la app, entran directo al Bloque 4 como caso de práctica — no hace falta terminar toda la teoría antes.

## Bloque 1 — Fundamentos de testing de APIs (sin herramientas todavía)

- Qué es una API REST y el modelo cliente-servidor
- Métodos HTTP (GET, POST, PUT, PATCH, DELETE) y cuándo se usa cada uno
- Anatomía de un request/response: headers, body, query params, path params
- Códigos de estado HTTP (2xx, 4xx, 5xx) y qué significan al testear
- JSON: estructura y validación de schema
- Autenticación: API Keys, Bearer tokens, OAuth2 (clave porque la app usa login con Google)
- Tipos de pruebas aplicadas a API: funcional, de contrato, negativas, de límites, autorización por rol

## Bloque 2 — Postman desde cero

- Instalación e interfaz
- Primer request contra una API pública de prueba
- Collections y organización de requests
- Variables: environment vs. collection vs. global
- Scripts: Pre-request Script y Tests (assertions con `pm.test`, Chai)
- Encadenar requests (ej: guardar el token de login y reusarlo en el siguiente request)
- Introducción a Newman (correr colecciones desde consola) — preparación para CI/CD

## Bloque 3 — Playwright y automatización web

- Qué es Playwright y en qué se diferencia de Selenium/Cypress
- Instalación, primer test, Test Runner
- Locators y selectors — buenas prácticas, evitar selectores frágiles
- Acciones y assertions (`expect`)
- Fixtures y hooks (`beforeEach`, etc.)
- Page Object Model (POM): qué problema resuelve, estructura de carpetas, cómo escribir una Page Object
- Manejo de datos de test / fixtures de datos
- Introducción a CI con GitHub Actions para correr Playwright automáticamente

## Bloque 4 — Integración con la app de padel (a medida que exista)

- Diseño de casos de prueba manuales por feature (ya dominado — cruzarlo con la automatización)
- Automatizar en Postman los endpoints a medida que se crean (login, crear partido, valorar jugador, etc.)
- Automatizar en Playwright los flujos E2E críticos (login con Google, crear partido, confirmar asistencia)
- Buenas prácticas de mantenimiento: qué automatizar y qué no, pirámide de testing

## Estado

- [ ] Bloque 1 — Fundamentos de testing de APIs
- [ ] Bloque 2 — Postman desde cero
- [ ] Bloque 3 — Playwright y Page Object Model
- [ ] Bloque 4 — Integración con la app de padel

Próxima sesión: arrancar Bloque 1.
