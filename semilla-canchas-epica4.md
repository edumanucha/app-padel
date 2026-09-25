# Semilla de datos para el Directorio de Canchas (Épica 4)

Documento de preparación: 20 canchas reales de Mendoza, investigadas manualmente (2026-09-05) para tener datos con qué arrancar el Directorio de Canchas (`historias-usuario-mvp.md`, Épica 4, US-4.1/US-4.3) el día que le toque el turno en la metodología épica-por-épica. **No se cargó nada en la base todavía** — la tabla `canchas` no existe (Épica 4 no arrancó, seguimos en la Épica 2).

## Origen y por qué esta fuente sí y otra no

Se evaluó primero `atcsports.io` (plataforma de reserva de canchas) — **descartada**: sus Términos y Condiciones prohíben explícitamente "reproducir, descargar, extraer, mostrar, publicar" cualquier información de la plataforma sin consentimiento escrito.

Se usó en su lugar **Bing Maps** (búsquedas manuales interactivas, no scraping automatizado): nombre, dirección, teléfono y horario de negocios son datos públicos (el mismo dato que el propio negocio publica en su Google Business/Instagram), sin cláusula equivalente de prohibición de reproducción. No se encontraron puntuaciones/reseñas en esta vista de Bing — pendiente sumarlas a mano más adelante si se quiere ese dato.

## Datos (20 canchas)

| # | Nombre | Dirección | Zona (valor de `perfiles.zona`) | Horario | Teléfono |
|---|---|---|---|---|---|
| 1 | Canchas de Padel las cañas | Calle 25 de Mayo 2425, Villa Nueva | Guaymallén | Cierra 01:00 | 0261 383-0999 |
| 2 | La Nave Padel | Calle Perú 1110 | Las Heras | Abre 15:00 | 0261 342-6111 |
| 3 | Arena Padel Mendoza | Calle Pedro del Castillo 3050, Villa Nueva | Guaymallén | Cierra 01:00 | 0261 557-7800 |
| 4 | Canchas de Pádel Banco Previsión | Calle Salta 2739 | Ciudad de Mendoza | (cerrado temporalmente) | 0261 537-5810 |
| 5 | UMaza Padel | Dr. Adolfo Calle 4136, Villa Nueva | Guaymallén | Cierra 00:00 | 0261 674-2993 |
| 6 | Las Vias Padel | Calle Pedro Pascual Segura 1852 | Godoy Cruz | Abre 15:00 | 0261 720-0538 |
| 7 | Padel House | Cnel. Juan Esteban Rodríguez 205 | Ciudad de Mendoza | Cierra 23:30 | 0261 588-4379 |
| 8 | Padel Mendoza Tenis | Boulogne Sur Mer 520 | Ciudad de Mendoza | Cierra 23:30 | — |
| 9 | CANO PADEL | Timoteo Gordillo 505 | Ciudad de Mendoza | Cierra 00:00 | 0261 246-7277 |
| 10 | De Volea Padel | Juan Isuani 1832, Campo Papa | Guaymallén | Cierra 02:01 | 0261 485-3697 |
| 11 | Punto Padel (punto para los amigos) | Calle Chacabuco 78 | Godoy Cruz | Cierra 23:00 | 0261 517-4665 |
| 12 | Punto de Oro Club de Padel | Altos Hornos de Zapla 2138 | Godoy Cruz | 24 horas | 0261 15-774-2319 |
| 13 | Pádel Club Libertad | España 575 | Godoy Cruz | — | 0261 661-1734 |
| 14 | Padel Canchas | Independencia 595 | Godoy Cruz | — | 0261 419-1991 |
| 15 | Terrada Padel Club | Perdriel | Luján de Cuyo | Cierra 23:30 | 0261 566-9774 |
| 16 | VyV Pádel | Nahuel Huapí 7721, Chacras de Coria | Luján de Cuyo | Cierra 20:30 | 0261 15-665-5792 |
| 17 | Top Padel Guaymallén | Europa 9526, Rodeo de la Cruz | Guaymallén | 24 horas | 0261 15-279-4975 |
| 18 | Padel Hípico Mendoza | Av. Carlos Thays | Ciudad de Mendoza | 24 horas | 0261 533-9531 |
| 19 | Bandera Center Padel | Calle Bandera de los Andes 4397, Villa Nueva | Guaymallén | Cierra 01:00 | — |
| 20 | Padel Las Vayas | Calle Sarmiento 2945 | Maipú | Cierra 00:00 | 0261 300-8536 |

## Pendiente para cuando arranque la Épica 4

- Diseñar la tabla `canchas` (probablemente: `nombre`, `direccion`, `zona`, `horario_apertura`, `horario_cierre`, `telefono`, `descripcion`, `valores` — este último sin dato todavía, no se tomó de ninguna fuente por el tema de precios de ATC).
- Decidir si `horario_apertura`/`horario_cierre` se suman como criterio de aceptación nuevo en US-4.1 de `historias-usuario-mvp.md` (no estaban contemplados en el diseño original de esa historia).
- Armar el `INSERT` de estas 20 filas como parte del script SQL de esa épica.
- Opcional: completar puntuaciones a mano si se considera importante (no se consiguieron por esta vía).
