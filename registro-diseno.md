# Registro de diseño — Padelito

Bitácora de cada cambio de diseño, con su **bandera** (tag de git) para poder volver a cualquier versión y una **planilla de evaluación** para comparar las versiones pantalla por pantalla.

Pedido del usuario (2026-10-01): *"por cada cambio de diseño armes una bandera y un documento de diseño; quiero en algún momento hacer una evaluación para ver cuál es la mejor, que incluya todas las pantallas"*.

---

## Cómo se trabaja

1. El rediseño se hace en la rama **`rediseno`**: la app real (`main`, la que usan los amigos) no cambia mientras tanto. Vercel arma solo un link de prueba de la rama.
2. **Un cambio por vez.** Cada cambio:
   - se elige primero sobre maquetas (`/pruebas-*`);
   - se aplica, se sube y se marca con una bandera `diseno-NN-nombre`;
   - se anota acá: qué cambió, en qué pantallas, por qué y la decisión del usuario.
3. Cuando todo cierra, la rama pasa a `main` (app real).

### Cómo volver a una versión

- **Ver** cómo era (sin tocar nada): `git checkout <bandera>`; para volver, `git checkout rediseno`.
- **Deshacer un solo cambio** (los demás quedan): `git revert` del commit de ese cambio.
- **Volver todo** a antes del rediseño: la bandera `antes-rediseno`.

---

## Banderas

| # | Bandera | Fecha | Cambio | Estado |
|---|---|---|---|---|
| D-00 | `antes-rediseno` | 2026-10-01 | Punto de partida (app tal como estaba) | Base |
| D-01 | `diseno-01-sin-emojis` | 2026-10-01 | Paso A: emojis → íconos de línea propios o solo texto | Publicado |
| D-02 | `diseno-02-titulos-cartel` | 2026-10-01 | Paso B: títulos en Big Shoulders, mayúscula | Publicado |
| D-03 | `diseno-03-jerarquia-cartel` | 2026-10-01 | Paso C: jerarquía "Cartel de estadio" | Publicado |
| D-04 | `diseno-04-pantallas-cartel` | 2026-10-01 | Paso D: todas las pantallas en estilo Cartel | Publicado |
| D-05 | `diseno-05-fuentes-y-compu` | 2026-10-01 | Paso E: fuentes C + versión de compu | Publicado |
| | `antes-sin-animaciones` | 2026-09-30 | (anterior) Antes de sacar las animaciones entre pantallas | Histórica |

---

## Cambios

### D-00 · `antes-rediseno` — punto de partida (2026-10-01)

Diagnóstico "olor a IA" (revisión del código, a partir de una lista que trajo el usuario):

| Aspecto | Estado | Detalle |
|---|---|---|
| Íconos | ✅ Propios | 38 íconos de línea dibujados a mano (`Icons.js`), sin `lucide-react` |
| Gradientes | ✅ Sin genéricos | Solo el del tablero (imita cartel de cancha) |
| Paleta | ✅ Propia | Verde cancha + amarillo pelota |
| Emojis | ❌ Muchos | ~200 en la app (Marcadorcito 64, demo 34, textos 36…), en botones y títulos |
| Tarjetas | ❌ Todas iguales | Misma sombra repetida 163 veces; cajitas redondeadas apiladas |
| Botones | ❌ Todo píldora | 263 `rounded-full`, mismo peso visual |
| Tipografía | ⚠️ Neutra | Archivo para todo; títulos sin carácter |
| Layout | ⚠️ Una columna | Todo centrado, tarjetas del mismo ancho (en compu: tablero 2/3 + 1/3) |

Plan propuesto (en orden): **A** sacar emojis → **B** tipografía de títulos → **C** jerarquía de tarjetas → **D** botones con distintos pesos → **E** detalles propios (dígitos de marcador, textura de cancha).

### Elección del estilo — `/pruebas-rediseno` (2026-10-01)

- **Opciones mostradas:** Hoy · 1 Cartel de estadio · 2 Editorial · 3 Marcador (Inicio con los mismos datos).
- **Elegida por el usuario:** **1 · Cartel de estadio** ("este estilo me encantó").
- **Pedido:** aplicarlo a toda la app, después a la versión de compu; "cualquier cosa volvemos atrás".

### D-01 · `diseno-01-sin-emojis` — paso A (2026-10-01)

- **Qué cambió:** ~150 emojis fuera. Íconos de línea propios en botones, opciones, modos del Marcadorcito, estrellas, tema y deportes (14 íconos nuevos en `Icons.js` + clase `.ico` para íconos dentro de texto). Textos sin emojis decorativos (es/en/pt).
- **Se quedan a propósito:** pelotita/Padelito, símbolos ⏭ ⏮ ⏸ del reloj (sin selector de emoji), manos que confirman el gesto de la cámara, ✕ y ✓.
- **Pantallas:** todas (27 archivos).

### D-02 · `diseno-02-titulos-cartel` — paso B (2026-10-01)

- **Qué cambió:** fuente de títulos `--font-titulo` = Big Shoulders (next/font, eje `opsz`), mayúscula y más grande en los 32 títulos de pantalla y en las hojas de abajo. El texto sigue en Archivo.

### D-03 · `diseno-03-jerarquia-cartel` — paso C (2026-10-01)

- **Inicio:** saludo grande sin tarjeta (puesto y puntos como etiqueta), próximo partido como protagonista verde tablero con fecha amarilla, Marcadorcito como único botón amarillo, crear/abiertos en fila con líneas, invitación como una línea, números grandes con divisores.
- **Toda la app:** esquinas 14–20 px → 6–8 px; 152 sombras → línea fina; 126 píldoras → rectángulos; 41 botones amarillos sin contorno grueso; barra de abajo oscura con la pestaña activa en amarillo.
- **Pendiente:** adaptar la vista de compu (pedido del usuario); pasar `rediseno` a `main` cuando el usuario lo apruebe.

### D-04 · `diseno-04-pantallas-cartel` — paso D (2026-10-01)

- **Qué cambió:** las 25 pantallas restantes rearmadas como el Inicio, siguiendo `herramientas/guia-estilo-cartel.md` (protagonista verde tablero, un solo botón amarillo, listas con líneas, números grandes). Login: Google es el único amarillo. Barras de estadística finas.
- **Pendientes chicos:** textos sin `t()` en algunas pantallas (Marcadorcito libre, ranking); en el perfil de otro jugador el % de victorias y el nivel se repiten (faltan claves de texto cortas).

### Elección de fuentes — `/pruebas-fuentes` (2026-10-01)

- **Opciones:** A Archivo · B Barlow · C Schibsted + números de tablero · D Bricolage + números de tablero (títulos siempre Big Shoulders).
- **Elegida:** **C** — tres fuentes con rol fijo.

### D-05 · `diseno-05-fuentes-y-compu` — paso E (2026-10-01)

- **Fuentes:** `--font-body`/`--font-heading` = Schibsted Grotesk; `--font-numero` = Chakra Petch (22 números grandes + días de las fechas); títulos `--font-titulo` = Big Shoulders.
- **Compu:** barra de arriba oscura (#10201a) con "PADELITO" en letra del cartel; Inicio con saludo, protagonista y números más grandes en `lg`; accesos del Inicio como filas con línea (también en celu).
- **Publicado** en main el 2026-10-01 (vuelta atrás: `antes-rediseno`).

<!-- Plantilla para cada cambio nuevo:

### D-NN · `diseno-NN-nombre` — título (fecha)

- **Qué cambió:**
- **Pantallas afectadas:**
- **Por qué:**
- **Opciones mostradas (maqueta):** `/pruebas-...` — A / B / C
- **Elegida por el usuario:**
- **Commit:**
- **Notas / qué mirar en la evaluación:**
-->

---

## Planilla de evaluación

Para comparar las versiones (banderas) cuando el usuario quiera. Puntaje de 1 a 5 por criterio; se completa mirando cada pantalla en cada versión.

**Criterios**
- **Identidad:** ¿parece Padelito o una app genérica hecha con IA?
- **Claridad:** ¿se entiende al toque qué hacer?
- **Uso en cancha:** ¿se lee y se toca bien con sol, transpirado, rápido? (sobre todo Marcadorcito)
- **Consistencia:** ¿se siente parte del resto de la app?

| Pantalla | Ruta | D-00 base | D-01 | D-02 | D-03 | Notas |
|---|---|---|---|---|---|---|
| Elegir deporte | `/elegir-deporte` | | | | | |
| Login | `/login` | | | | | |
| Completar perfil | `/completar-perfil` | | | | | |
| **Inicio** | `/` | | | | | |
| Menú | `/menu` | | | | | |
| Configuración | `/configuracion` | | | | | |
| Quiénes somos | `/quienes-somos` | | | | | |
| Cómo funciona | `/como-funciona` | | | | | |
| **Jugadores / ranking** | `/jugadores` | | | | | |
| Perfil de otro jugador | `/jugadores/[id]` | | | | | |
| **Mi perfil** | `/perfil` | | | | | |
| Compañero fijo | `/companero-fijo` | | | | | |
| Disponibilidad | `/disponibilidad` | | | | | |
| Crear partido | `/crear-partido` | | | | | |
| Partidos abiertos | `/partidos` | | | | | |
| Mis partidos | `/mis-partidos` | | | | | |
| Detalle de partido | `/partido/[id]` | | | | | |
| **Marcadorcito** (vertical) | `/partido/[id]/marcador` | | | | | |
| **Marcadorcito** (apaisado) | idem, modo apaisado | | | | | |
| Marcadorcito libre (armar) | `/marcador-libre` | | | | | |
| Estadísticas del partido | `/partido/[id]/estadisticas` | | | | | |
| Partido compartido (público) | `/p/[id]` | | | | | |
| Invitaciones | `/invitaciones` | | | | | |
| Mensajes | `/mensajes` | | | | | |
| Conversación | `/mensajes/[id]` | | | | | |
| Canchas | `/canchas` | | | | | |
| Detalle de cancha | `/canchas/[id]` | | | | | |
| Apelaciones (admin) | `/apelaciones` | | | | | |
| Admin canchas | `/admin/canchas` | | | | | |
| Sin conexión | `/offline` | | | | | |
| Hojas de abajo (opciones, filtros, etc.) | varias | | | | | |
| Vista en compu (Inicio) | `/` en pantalla grande | | | | | |
