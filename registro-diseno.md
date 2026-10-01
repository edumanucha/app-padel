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
| Admin canchas | `/admin` | | | | | |
| Sin conexión | `/offline` | | | | | |
| Hojas de abajo (opciones, filtros, etc.) | varias | | | | | |
| Vista en compu (Inicio) | `/` en pantalla grande | | | | | |
