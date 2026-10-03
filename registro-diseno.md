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
| D-06 | `diseno-06-pantallas-restantes` | 2026-10-01 | Paso F: Completar perfil, controles del Marcadorcito y pantallas menores en Cartel | Publicado |
| D-07 | `diseno-07-destacados-perfil` | 2026-10-02 | Perfil: destacados "Cara a cara" (cómo venís, mejor dupla, cuenta pendiente, tu cancha) | Publicado |
| D-08 | `diseno-08-icono-pelota` | 2026-10-03 | Ícono de la app: pelota amarilla sobre verde del cartel (opción A) | Publicado |
| D-09 | `diseno-09-instalar-apk` | 2026-10-03 | Botón Instalar: hoja con APK de Android + pasos de iPhone | Publicado |
| D-10 | `diseno-10-tarjeta-partido` | 2026-10-03 | Tarjeta cuadrada para compartir el resultado (B si ganás, C si perdés) | Publicado |
| D-11 | `diseno-11-grupos` | 2026-10-03 | Grupos de amigos: lista, ranking, cara a cara, miembros/invitar y link para unirse | Publicado |
| D-12 | `diseno-12-consejos` | 2026-10-03 | Consejo del día en el Inicio + pantalla Consejos (164, por categoría, con fuentes); se saca el espacio de publicidad de ejemplo y Elegí tu deporte | Publicado |
| D-13 | `diseno-13-selector-grupo` | 2026-10-03 | Jugadores: selector Global / grupo; tarjeta con "Van 5 a 2"; Inicio en una sola consulta | Publicado |
| D-14 | `diseno-14-quienes-somos-perfil` | 2026-10-03 | Quiénes somos: tarjeta "Invitame a jugar" que lleva al perfil de quien arma la app | Publicado |
| D-15 | `diseno-15-torneos-preview` | 2026-10-03 | Vista previa de torneos (/pruebas-torneos): americano, mexicano y armable (liga o eliminación) | Vista previa |
| D-16 | `diseno-16-torneos` | 2026-10-03 | Torneos reales: lista, crear (americano, mexicano, liga, eliminación), jugar y podio, guardados en la base | Publicado |
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

### D-06 · `diseno-06-pantallas-restantes` — paso F (2026-10-01)

- **Qué cambió:** las partes que no habían pasado al Cartel (revisión del código buscando clases viejas): Completar perfil (primer pantalla de una cuenta nueva), controles y hojas alrededor del tablero del Marcadorcito y su demo (sin sumar alto en apaisado), Invitar jugador, caja de sugerencias, subir foto, aviso de girar, Futbolito/Basquelito, pantalla sin señal y globos de la guía.
- **Se queda igual a propósito:** el tablero del Marcadorcito y sus botones de punto (`Marcador.module.css`), que son la identidad original.

### D-07 · `diseno-07-destacados-perfil` — destacados del perfil (2026-10-02)

- **Qué cambió:** en Mi perfil, entre el cartel de ranking y el acordeón de estadísticas, aparece siempre (sin tocar nada) el bloque "Cara a cara": cartel verde con una frase de cómo venís ("Ganaste 3 seguidos"), % de ganados y los últimos 5 (G/P); después **Tu mejor dupla**, **Tu cuenta pendiente** (el rival que más te cuesta, con el último resultado) y **Tu cancha**. Mínimo 2 partidos para que una dupla, rival o cancha cuente. El acordeón de estadísticas de siempre queda abajo.
- **Pantallas afectadas:** Mi perfil (`VerPerfilForm.js` + `DestacadosPerfil.js`, cálculo en `lib/destacadosPerfil.js`).
- **Por qué:** las estadísticas estaban escondidas en un acordeón y no había destacados.
- **Opciones mostradas (maqueta):** artifact privado "Estadísticas del perfil" — A Tablero / B Planilla con pestañas / C Cara a cara
- **Elegida por el usuario:** C
- **Datos:** RPC nueva `mis_cruces_partidos` (`app/backend/sql/068_destacados_perfil.sql`, hay que correrla en Supabase); sin ella el bloque no aparece y el resto del perfil sigue igual.
- **Notas / qué mirar en la evaluación:** saques mantenidos, puntos de oro y tie-breaks de la maqueta no se guardan todavía, quedaron afuera.

### D-08 · `diseno-08-icono-pelota` — ícono de la app (2026-10-03)

- **Qué cambió:** el ícono (pantalla de inicio de Android, iPhone y pestaña del navegador) pasa de pelota amarilla clara sobre verde claro, que se veía desvaída, a **pelota amarilla fuerte con costuras verdes sobre verde oscuro del cartel**.
- **Archivos:** `app/icon.js` (pestaña 32 px), `app/apple-icon.js` (iPhone 180 px) y `app/pwa-icon/route.js` (192 y 512 px, con margen para el recorte circular de Android).
- **Por qué:** el usuario vio el ícono en pwabuilder.com y lo encontró feo; se hace antes de generar el APK porque lo usa.
- **Opciones mostradas (maqueta):** artifact privado "Íconos de Padelito" — A pelota amarilla sobre verde / B verde sobre amarillo / C pelota en la cancha / D pelota gigante
- **Elegida por el usuario:** A

### D-09 · `diseno-09-instalar-apk` — botón Instalar con APK (2026-10-03)

- **Qué cambió:** el botón "Instalar la app" (Inicio, Mi perfil, Configuración) abre una hoja desde abajo. En **Android**: "Descargar la app (APK)" (recomendado) o "Instalar desde el navegador", con el aviso de origen desconocido. En **iPhone**: los pasos de Safari dentro de la hoja. En compu queda como antes.
- **Archivos:** `components/InstalarApp.js`, `public/padelito.apk`, `public/.well-known/assetlinks.json`, `public/sw.js`, `next.config.mjs`. Además, "Política de privacidad" al final de Configuración.
- **Opciones mostradas (maqueta):** artifact privado "Instalar Padelito" (botón, hoja Android, hoja iPhone).
- **Notas:** el APK lo genera PWABuilder; la llave de firma vive fuera del repo (ver memoria `reference_apk_android_llave`).

### D-10 · `diseno-10-tarjeta-partido` — tarjeta para compartir (2026-10-03)

- **Qué cambió:** en Estadísticas del partido, botón amarillo "Compartir tarjeta" que arma una imagen cuadrada de 1080 px con el resultado y abre el menú de compartir del celu (en compu la descarga). **B "Cartel amarillo"** ("Ganamos" gigante) cuando ganaste y **C "Pelota"** ("X / Y le ganaron a ...") cuando perdiste. Lleva primer nombre de cada jugador, sets, fecha, duración y cancha.
- **Archivos:** `lib/tarjetaPartido.js` (dibujo en canvas, todo en el celu), `components/BotonCompartirTarjeta.js`, `components/EstadisticasPartidoForm.js`, textos `tarjeta.*` en es/en/pt.
- **Opciones mostradas (maqueta):** artifact privado "Tarjetas de partido" — A Tablero / B Cartel amarillo / C Pelota
- **Elegida por el usuario:** B y C, que "vayan cambiando según la situación".
- **Pendiente:** la línea del acumulado ("Van 5 a 2") queda para cuando existan los grupos; el botón por ahora solo está en Estadísticas del partido.

### D-11 · `diseno-11-grupos` — grupos de amigos (2026-10-03)

- **Qué cambió:** pantallas nuevas `/grupos` (mis grupos + invitaciones + crear, hasta 5), `/grupos/<id>` (pestañas Ranking este mes/siempre, Cara a cara y Miembros con invitar por WhatsApp o buscando jugadores, salir, sacar y eliminar) y `/g/<código>` (link de invitación: sin sesión manda a /login y vuelve con `volverA`; sin perfil manda a /completar-perfil). Acceso nuevo "Mis grupos" en la sección Comunidad del Inicio.
- **Reglas:** cuentan los partidos terminados con 3 o más miembros del grupo; mismos puntos que el ranking global; el creador es admin; solo los miembros ven las estadísticas (RLS en `069_grupos_de_amigos.sql`).
- **Opciones mostradas (maqueta):** artifact privado "Grupos de amigos" (6 pantallas).
- **Pendiente:** selector Global/Grupo dentro de Jugadores (pantallas 5 y 6 de la maqueta) y la línea "Van 5 a 2" en la tarjeta para compartir.

### D-12 · `diseno-12-consejos` — consejos de pádel (2026-10-03)

- **Qué cambió:** el "Tip de pádel" del Inicio (título de un blog externo) pasa a ser **Consejo del día**: uno por día (hora de Argentina), escrito con palabras propias, con su fuente; al tocarlo abre **/consejos** (164 consejos, filtro por 11 categorías, fuentes con link). Acceso nuevo "Consejos de pádel" en Recursos.
- **Cómo se armaron:** lectura de 4 guías de PadelStar y del libro "Pádel: Enseñanza y Aprendizaje"; reescritos con palabras propias; se descartaron automáticamente los que repetían 6 o más palabras seguidas del original, los duplicados y las reglas del libro (2018). Los PDF quedan FUERA del repo (`Descargas/guias-padelstar`).
- **Archivos:** `lib/consejos.js`, `components/ConsejosForm.js`, `components/ConsejoDelDia.js`, `app/consejos/page.js`; se borra `api/tip-padel`.
- **También ese día:** se sacó el espacio de publicidad de ejemplo y "Elegí tu deporte" / Futbolito / Basquelito (la app se enfoca solo en pádel).
- **Opciones mostradas (maqueta):** artifact privado "Consejos de pádel" (3 pantallas).

### D-13 · `diseno-13-selector-grupo` — selector de grupo, "Van X a Y" y Inicio rápido (2026-10-03)

- **Selector Global / grupo en Jugadores:** si estás en algún grupo aparecen chips arriba del ranking; con un grupo elegido el podio y la lista son solo entre sus miembros (este mes / siempre, "X ganados · Y perdidos"), con la regla de 3 miembros y sin el botón de filtros. Usa `ranking_grupo` (SQL 069).
- **"Van 5 a 2" en la tarjeta de compartir:** cuántos partidos le ganaste / perdiste contra ESTA MISMA pareja rival (mínimo 2 jugados), calculado con `mis_cruces_partidos` (SQL 068). No depende de los grupos.
- **Velocidad 4:** el Inicio pide perfil + resumen + notificaciones en una sola consulta (`home_inicial`, SQL 070); si la función no existe o falla, vuelve al camino de 3 pedidos.
- **Opciones mostradas (maqueta):** pantallas 5 y 6 del artifact privado "Grupos de amigos".

### D-14 · `diseno-14-quienes-somos-perfil` — tarjeta "Invitame a jugar" (2026-10-03)

- **Qué cambió:** en Quiénes somos, debajo de la frase "invitame, que me prendo", una fila con la pelota, el nombre y el botón amarillo "Invitame a jugar", que abre el perfil de Padelito de quien arma la app (desde ahí se puede mandar un mensaje o invitarlo a un partido).
- **Archivos:** `components/QuienesSomosForm.js` (constante `ID_CREADOR`), textos `quienesSomos.creadorRol` e `invitameBoton` en es/en/pt.
- **Elegida por el usuario:** solo el botón al perfil de Padelito, sin Instagram.

### D-15 · `diseno-15-torneos-preview` — torneos entre amigos, vista previa (2026-10-03)

- **Qué es:** página `/pruebas-torneos` con datos de ejemplo (no guarda nada) que funciona de verdad: **Americano** (parejas que rotan sin repetir compañeros), **Mexicano** (parejas según la tabla) y **Armable** (parejas fijas, con liga todos contra todos o eliminación directa, con puntos por victoria/empate a elección). Crear, ronda en curso con carga de puntos, tabla en vivo y podio final con tarjeta (maqueta).
- **Archivos:** `lib/torneos.js` (cruces y tablas, funciones puras, probadas), `components/PruebaTorneosForm.js`, `app/pruebas-torneos/page.js`.
- **Opciones mostradas (maqueta):** artifact privado "Torneos entre amigos" (4 pantallas).
- **Pendiente ("después hacemos todo"):** conectar a grupos y a la base de datos, invitados sin cuenta, tarjeta real para compartir, link público en vivo.

### D-16 · `diseno-16-torneos` — torneos de verdad (2026-10-03)

- **Qué es:** la vista previa (D-15) conectada a la base. `/torneos` (los que organizás o jugás, en juego y terminados), `/torneos/nuevo` (nombre, formato, jugadores con cuenta —se buscan o salen de tus frecuentes— o invitados por nombre, canchas, puntos y rondas) y `/torneos/<id>` (ronda en curso, tabla, podio; el organizador carga los resultados y cierra la ronda; los demás lo ven y se actualiza solo cada 20 s). Acceso "Torneos" en Comunidad del Inicio.
- **Reglas:** torneo suelto (no necesita grupo); tiene su propia tabla y NO toca el ranking global; solo el organizador escribe (funciones de `071_torneos.sql` con auth.uid()); hasta 20 torneos en juego por organizador.
- **Archivos:** `lib/torneosApp.js` (puente base ↔ cruces, probado simulando torneos completos de los 4 formatos), `components/TorneosForm.js`, `NuevoTorneoForm.js`, `TorneoForm.js`, rutas en `app/torneos`.
- **Pendiente:** textos traducidos (hoy en español), tarjeta para compartir el podio, link público para seguir en vivo, avisar a los participantes con cuenta.

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
