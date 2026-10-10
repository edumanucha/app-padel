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
| D-17 | `diseno-17-un-anotador` | 2026-10-04 | Marcadorcito: un solo anotador (los demás miran y pueden pasar el control), pantalla final completa y 3 s para deshacer el último punto | Publicado |
| D-18 | `diseno-18-modo-visitante` | 2026-10-04 | Modo visitante: Inicio sin cuenta y aviso en las pantallas privadas | Publicado |
| D-19 | `diseno-19-partido-cargado` | 2026-10-04 | Cargar un partido jugado sin Marcadorcito: avisos, corrección, 'no jugué' y un máximo de uno por día | Publicado |
| D-20 | `diseno-20-guia-celu` | 2026-10-04 | Guía de dónde dejar el celu (Marcadorcito libre y Cómo funciona) | Publicado |
| D-21 | `diseno-21-avisos-marcadorcito` | 2026-10-04 | Aviso de Marcadorcito en juego, ayudas de cámara y voz, reloj recomendado, sin 'Generar partido rápido' | Publicado |
| D-22 | `diseno-22-botones-franja-nombres` | 2026-10-04 | Marcadorcito: botones Punto A / Deshacer / Punto B con relieve, franja Pong con cancha de pádel, nombres cortos, sonidos nuevos | Publicado |
| D-23 | `diseno-23-link-reloj` | 2026-10-05 | Vista previa del link, direcciones /probar y /reloj, guía del celu con el alcance real del reloj y de la voz | Publicado |
| D-24 | `diseno-24-cerrar-y-eliminar` | 2026-10-05 | Cerrar partidos abiertos (cualquier jugador, o solo a las 2,5 h) y Eliminar mi cuenta | Publicado |
| D-25 | `diseno-25-tarjeta-resultado` | 2026-10-06 | Tarjeta del resultado: "Anotado con Padelito", fecha completa, tiempo · sets y la cancha | Publicado |
| D-26 | `diseno-26-logo-reloj` | 2026-10-06 | Logo nuevo: reloj con la pelota de esfera y "40-15"; nombre "padelito" con la pelota de punto de la i | Publicado |
| D-27 | `diseno-27-animacion-inicio` | 2026-10-06 | Animación de entrada: la pelota pica, "40-15", zoom out hasta "padelito" | Publicado |
| D-28 | `diseno-28-tarjeta-pelota-cancha` | 2026-10-06 | Tarjeta del resultado: dos estilos al azar, "pelota" y "cancha" | Publicado |
| D-29 | `diseno-29-estadisticas-avanzadas` | 2026-10-08 | Estadísticas avanzadas punto a punto: gráfico del partido, saque, presión, games dados vuelta, ritmo; en el perfil rachas de partidos con niveles, por compañero y cuándo jugás mejor; nivel de racha en el Inicio | Pendiente de revisión |
| D-30 | `diseno-30-tablero-estadisticas` | 2026-10-09 | Tablero de estadio en el perfil (cartel verde siempre visible con % ganados, racha y quiebres), partidos de la lista con "vs rivales", gráfico punto a punto más claro; se sacan "Cuándo jugás mejor" y "Tu cancha" | Pendiente de revisión |
| D-31 | `diseno-31-mis-partidos-y-games` | 2026-10-09 | Perfil: "Mis partidos" como barra de cartel con el último partido visible y tarjetas estilo Inicio (fecha amarilla + cartel verde); el gráfico del partido pasa a "Los games del partido" (cuadraditos verde/rojo por game y racha) | Pendiente de revisión |
| D-32 | `diseno-32-grupos-en-ranking` | 2026-10-09 | Jugadores: tarjetas de grupo deslizables arriba del ranking (tu puesto en cada grupo y cuánto te falta o le sacás) y cartel "Competí con tus amigos" para quien no tiene grupos | Pendiente de revisión |
| D-33 | `diseno-33-como-venis-amarilla` | 2026-10-09 | Perfil: la tarjeta "Cómo venís" pasa a amarilla (había exceso de verde con la tarjeta del jugador); el nivel 7ª ya no dice "(mínima)" | Pendiente de revisión |
| D-34 | `diseno-34-i-con-pelota` | 2026-10-09 | La pelotita amarilla de Padelito como punto de la primera I en el título de cada pantalla (no en títulos con Í acentuada ni en nombres) | Pendiente de revisión |
| D-35 | `diseno-35-celu-cerca` | 2026-10-09 | Marcadorcito: al elegir el modo, consejo con canchita para dejar el celu cerca, del lado donde jugás | Pendiente de revisión |
| D-36 | `diseno-36-pelotita-cada-pantalla` | 2026-10-10 | La pelotita de la i en al menos un texto de cada pantalla principal (Inicio, Jugadores, Perfil, Marcadorcito) y en la imagen para compartir | Pendiente de revisión |
| D-37 | `diseno-37-barra-botones-iguales` | 2026-10-10 | Barra de abajo: los 4 botones del mismo ancho, la marca amarilla siempre del mismo tamaño | Pendiente de revisión |
| D-38 | `diseno-38-marcadorcito-cartel-vs` | 2026-10-10 | Formulario del Marcadorcito: menos texto, parejas en cartel verde con VS, punto de oro como interruptor, "Cargar un partido ya jugado" al final | Pendiente de revisión |
| D-39 | `diseno-39-podio-escalones` | 2026-10-10 | Podio del ranking: las barras suben una por una desde abajo sin estirar el cartel y el 1° hace un pop amarillo | Pendiente de revisión |
| D-40 | `diseno-40-duelo-grupo-inicio` | 2026-10-10 | Inicio: cartel VS con vos contra el que tenés arriba en tu grupo (no aparece sin grupo) | Pendiente de revisión |
| D-41 | `diseno-41-demo-modos-elegibles` | 2026-10-10 | Demo del Marcadorcito: los modos se pueden tocar y van en orden Reloj, Cámara, Voz, Botones | Pendiente de revisión |
| D-42 | `diseno-42-filtro-canchas` | 2026-10-10 | Canchas: cambiar de provincia, pastillas por localidad con cantidad de clubes y buscador; en Buenos Aires, primero regiones | Pendiente de revisión |
| D-43 | `diseno-43-canchas-cabecera-verde` | 2026-10-10 | Canchas: bloque verde con la provincia, "Cambiar" amarillo, buscador y cuántos clubes y localidades; filas con la cantidad de canchas a la derecha | Pendiente de revisión |
| D-44 | `diseno-44-cancha-sin-resenas` | 2026-10-10 | Ficha del club: sin reseñas; botón amarillo Ver en Google Maps | Pendiente de revisión |
| D-45 | `diseno-45-jugadores-ejemplo-y-ficha-usuario` | 2026-10-10 | Jugadores de ejemplo con etiqueta "Ejemplo" (directorio, ranking, perfil) y estadísticas con "Quiénes son" y ficha por usuario | Pendiente de revisión |
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

### D-17 · `diseno-17-un-anotador` — un solo anotador y pantalla final (2026-10-04)

- **Qué cambió:** solo una persona suma los puntos de un partido (quien lo empieza); los demás jugadores con cuenta lo miran en vivo con el cartel "Estás mirando · lleva los puntos X" y pueden recibir el control desde Opciones > Partido. Pantalla final con "Partido para X", duración, Compartir resultado, Ver estadísticas e Ir al Inicio. El último punto del partido tarda 3 s en cerrarse (con botón Deshacer). Protección contra puntos dobles.
- **Pantallas afectadas:** Marcadorcito (vertical y apaisado).
- **Por qué:** primer partido real con el reloj; dos celus anotando se pisaban y faltaban datos.
- **Datos:** `072_un_solo_anotador.sql` (columna `anota_id`, política y `pasar_control_marcador`).

### D-18 · `diseno-18-modo-visitante` — modo visitante (2026-10-04)

- **Qué cambió:** el Inicio sin sesión muestra qué hay (probar Marcadorcito y torneo, consejos, cómo funciona, quiénes somos) con "Crear mi cuenta" como único botón amarillo. Las pantallas privadas muestran un aviso para crear la cuenta y, al volver del login, regresan a donde estaban. Públicas: login, consejos, quiénes somos, cómo funciona, privacidad, pruebas, demo del marcador, /p/ y /g/.
- **Archivos:** `components/PuertaVisitante.js`, `components/HomeVisitante.js`, `components/HomeForm.js`.

### D-19 · `diseno-19-partido-cargado` — partido jugado sin Marcadorcito (2026-10-04)

- **Qué cambió:** pantalla "Cargar un partido jugado" (fecha, cancha, compañero y rivales con cuenta o por nombre, hasta 3 sets). Se avisa a los otros jugadores con cuenta; cualquiera puede corregir el resultado (7 días) o decir "No jugué este partido" sin aceptar nada. Suma al ranking como un partido normal. Máximo un partido cargado a mano por día.
- **Datos:** `073_partidos_cargados_a_mano.sql` y `074_limite_diario_carga_manual.sql`.
- **Pendiente:** los invitados sin cuenta no reciben aviso.

### D-20 · `diseno-20-guia-celu` — guía de dónde dejar el celu (2026-10-04)

- **Qué cambió:** dibujo de la cancha con el celu en el vidrio del fondo y cinco consejos. Va arriba de "Empezar a jugar" (Marcadorcito libre) y en Cómo funciona.
- **Archivos:** `components/GuiaCelular.js`.

### D-21 · `diseno-21-avisos-marcadorcito` — avisos y reloj recomendado (2026-10-04)

- **Qué cambió:** notificación "X empezó a llevar el marcador de tu partido" a los otros jugadores con cuenta (abre el marcador) y acceso "Volver al partido" en el Inicio mientras está en juego. En Opciones, cámara y voz explican cómo usarlas (mano derecha abierta = punto A, izquierda = punto B, pulgar = deshacer; comandos de voz con "marcador" adelante). El reloj aparece como "Recomendado" y su formato queda fijo. Se saca "Generar partido rápido". Cómo funciona (es/en/pt) recomienda el reloj.
- **Datos:** `075_aviso_marcadorcito_nuevo.sql`.
- **Herramienta de QA (no es diseño):** `/pruebas-distancia` mide hasta qué distancia llegan los botones del reloj y si el puntaje se actualiza bien en el reloj.

### D-22 · `diseno-22-botones-franja-nombres` — botones, franja Pong y nombres cortos (2026-10-04)

- **Qué cambió:** Punto A, Deshacer y Punto B en una línea con relieve arcade (opción A de la maqueta), tamaño fijo y letra de cartel; franja Pong dibujada como una cancha (red, líneas de saque, línea central) con cuatro jugadores quietos que devuelven la pelota; en apaisado va chiquita entre los puntajes. Primer nombre de cada jugador en el tablero y encabezado de una línea. Sonidos de la prueba de distancia y uno de game ganado. Quien solo mira no ve las opciones de llevar puntos y puede activar su reloj.
- **Pantallas afectadas:** Marcadorcito (vertical y apaisado).
- **Maquetas mostradas:** botones (A, B, C y dos estilos de relieve), Pong (versión A y B, 2 contra 2, cancha real, jugadores quietos con rebote).
- **Archivos:** `PongPunto.js`, `MarcadorForm.js`, `Marcador.module.css`.

### D-23 · `diseno-23-link-reloj` — link compartible (2026-10-05)

- **Qué cambió:** imagen de vista previa y textos al compartir el link (`opengraph-image.js`, metadatos del layout); `/probar` redirige al Marcadorcito de ejemplo; `/reloj` explica el modo reloj; guía del celu con el alcance real (reloj casi 9 m, voz menos de 2 m).
- **Link:** `padelitoapp.com.ar` desde 2026-10-09 (antes `padelito-app.vercel.app`; los viejos `padelito-app.vercel.app` y `frontend-ten-theta-89.vercel.app` siguen andando).

### D-24 · `diseno-24-cerrar-y-eliminar` — cerrar partidos abiertos y eliminar la cuenta (2026-10-05)

- **Qué cambió:** cualquier jugador puede terminar un partido que quedó abierto (queda cancelado, cartel "Partido cancelado"); se cierran solos a las 2,5 h (pg_cron). En Mi perfil, "Eliminar mi cuenta" con confirmación escrita.
- **Datos:** `078` a `081` (cerrar abandonado, cierre automático, cualquier jugador, eliminar cuenta).

### D-25 · `diseno-25-tarjeta-resultado` — tarjeta del resultado (2026-10-06)

- **Qué cambió:** arriba "Anotado con Padelito" (antes "MARCADORCITO") y la fecha completa dd/mm/aaaa; abajo "40' · Sets 2-0" (se saca el "2 sets" repetido) y debajo la cancha. Sin el pie "Anotado con Marcadorcito".
- **Pantallas afectadas:** tarjeta que se comparte al terminar el Marcadorcito (`lib/tarjetaResultado.js`).
- **Opciones mostradas (maqueta):** antes / después, en el chat.
- **Por qué:** que se sepa qué app es y cuándo/dónde se jugó.

### D-26 · `diseno-26-logo-reloj` — logo nuevo (2026-10-06)

- **Qué cambió:** el ícono pasa de la pelota sola a un **reloj cuya esfera es la pelota**, con el tanteador **"40-15"** (Chakra Petch convertida a trazo, `lib/marcaPadelito.js`). El nombre pasa a **"padelito" en minúsculas con la pelota como punto de la i** (`components/MarcaPadelito.js`); la "o" queda normal.
- **Pantallas afectadas:** ícono de la pestaña, iPhone y PWA, imagen al compartir el link, barra de la compu, Inicio de visitantes y todos los lugares que usaban `Logo` (puerta de visitante, Quiénes somos, perfiles, mensajes).
- **Opciones mostradas (maqueta):** 9 rondas (chat y hojas locales): pelota como O, punto de saque, P en la pelota, paleta, tablero, bote, reloj como O, "ito" chico; después variantes del reloj con y sin contador (15, 15-0, visor) y de la i con pelota.
- **Elegida por el usuario:** reloj-pelota con "40-15" + "padelito" con la pelota en la i.
- **Por qué:** la pelota sola era genérica (cualquier deporte de raqueta); el reloj dice lo que hace la app.
- **Pendiente:** el ícono del APK de Android se actualiza al volver a generarlo con PWABuilder.

### D-27 · `diseno-27-animacion-inicio` — animación de entrada (2026-10-06)

- **Qué cambió:** al abrir la app (primera vez del día; desde el 2026-10-07, después de una hora sin usarla) se ve ~3 s: fondo claro, cámara cerca, la pelota del logo entra picando 3 veces, se frena con "40-15" y la cámara se aleja hasta mostrar "padelito" con la pelota de punto de la i (igual al encabezado). Se saltea tocando. Sin sonido. No aparece con "reducir movimiento" ni en `/pruebas-*`.
- **Componente:** `components/AnimacionInicio.js` (montado en `app/layout.js`).
- **Opciones mostradas:** 8 versiones en el chat + un video de 3 s con sonido.
- **Elegida por el usuario:** la v8 (pelota chica como en el encabezado, termina igual al encabezado).

### D-28 · `diseno-28-tarjeta-pelota-cancha` — tarjeta del resultado, dos estilos (2026-10-06)

- **Qué cambió:** la tarjeta que se comparte al terminar sale al azar en uno de dos estilos. **Pelota:** fondo amarillo con costuras gigantes, "GANAMOS" enorme, sets en números de tablero, parejas, tiempo y sets ganados, y "padelito" abajo; si se perdió, la misma en verde con "PERDIMOS". **Cancha:** la cancha vista desde arriba, cada pareja en su mitad (la propia arriba), los games de cada set en amarillo si se ganaron y la etiqueta GANAMOS/PERDIMOS sobre la red.
- **Código:** `lib/tarjetaResultado.js` (`dibujarTarjetaPelota`, `dibujarTarjetaCancha`, `dibujarNombre`); la anterior (`dibujarTarjetaTV`) queda para /pruebas-tarjeta.
- **Opciones mostradas:** 5 estilos (cartel, tablero, claro, pelota, cancha); el usuario eligió pelota y cancha, al azar.

### D-29 · `diseno-29-estadisticas-avanzadas` — estadísticas avanzadas y rachas de partidos (2026-10-08)

- **Qué cambió:**
  - **Estadísticas del partido** (`/partido/[id]/estadisticas`): nuevo cartel verde "El partido punto a punto" — gráfico de línea (SVG a mano, sin librería) con la diferencia acumulada de puntos (tu pareja − rival), área amarilla cuando ibas arriba, rayitas finas al final de cada game y líneas marcadas al final de cada set, con "SET 1 · 6-4" arriba de cada tramo; abajo la mayor ventaja tuya y del rival. Después de las barras de siempre, cuatro bloques con título condensado: **Saque** (games ganados con tu saque y con saque rival "X de Y", % de puntos ganados sacando y restando), **Puntos de presión** (% grande + 30-30, iguales/ventaja y punto de oro), **Games dados vuelta** (Remontadas y Te dieron vuelta, "de N games abajo/arriba") y **Ritmo** (game más largo en puntos y tiempo, promedio por game).
  - **Mi perfil** (dentro del acordeón de estadísticas): **Rachas de partidos** (racha actual con nivel, mejor racha ganando, peor racha perdiendo), **Saque y presión** ("En los puntos clave ganás el 58%", saque retenido y quiebres con la tendencia de los últimos 5 contra los anteriores, remontadas / te dieron vuelta), **Por compañero** (top 3 con 2+ partidos: % saque y % presión), **Cuándo jugás mejor** (por horario de Mendoza, día y cancha, solo grupos con 2+ partidos) y **Partidos a 3 sets**.
  - **Inicio:** debajo de "Racha ganada", el nivel de la racha en una etiqueta amarilla (En racha 2, Encendido 3, Imparable 4, Leyenda 5+). Si venís perdiendo 2 o más, una línea gris para arriba (Mala racha, A remontar, Toca dar vuelta la historia · N seguidos). Todos con su (?).
- **Pantallas afectadas:** Estadísticas del partido, Mi perfil (sección Estadísticas), Inicio (número de racha).
- **Código:** `lib/estadisticasAvanzadas.js` (funciones puras: `analizarPartido`, `calcularAvanzadasPerfil`, `calcularRachas`, `nivelRacha`, `textoRacha`), `components/GraficoPuntoAPunto.js`, `components/EstadisticasAvanzadasPerfil.js`; `InfoEstadistica` acepta `color` para usarse sobre el cartel verde.
- **Datos:** sin SQL nuevo. Todo sale de `resultados_partido.estado.log` (la RLS ya deja leer los partidos que jugaste); el compañero de cada partido sale de `mis_cruces_partidos` (068). Los partidos sin log (viejos o cargados a mano) cuentan para rachas, horarios, canchas y 3 sets, no para saque/presión.
- **Por qué:** pedido del usuario: sacarle más jugo al registro punto por punto y sumar rachas de partidos con niveles.
- **Opciones mostradas (maqueta):** ninguna; se implementó directo para revisión.
- **Elegida por el usuario:** pendiente.
- **Notas / qué mirar en la evaluación:** el gráfico a 390 px de ancho (etiquetas de sets cortas cuando el set es angosto), contraste del área amarilla en el cartel verde, largo de "Toca dar vuelta la historia" en la columna angosta del Inicio, que las definiciones de los (?) se entiendan.

### D-30 · `diseno-30-tablero-estadisticas` — tablero de estadio, rivales en la lista y gráfico más claro (2026-10-09)

- **Qué cambió:**
  - **Mi perfil:** el resumen de estadísticas deja de ser un acordeón cerrado y pasa a ser un cartel verde siempre visible (opción A): % de partidos ganados en grande y amarillo, etiqueta de racha (solo ganando, desde 2 seguidos), ganados / perdidos / mejor racha y las barras de quiebres. "Ver todas las estadísticas" abre el detalle de antes. Sin partidos terminados queda el acordeón de siempre.
  - **Lista de partidos del perfil** ("Ver partidos"): cada fila dice contra quién jugaste ("vs Pérez y Gómez", en negrita), con fecha, cancha y sets debajo (lista A).
  - **Gráfico "Quién iba ganando"** (antes "El partido punto a punto"): zonas verde (vas ganando) y roja (va ganando el rival) con cartel, puntos de mejor y peor momento y una línea que explica cómo leerlo.
  - **Sacado a pedido del usuario:** el bloque "Cuándo jugás mejor" (horario, día, cancha) del perfil y el destacado "Tu cancha" ("no sirve de nada, llena la pantalla").
- **Pantallas afectadas:** Mi perfil, Estadísticas del partido.
- **Código:** `components/HeroEstadisticasPerfil.js` (nuevo), `VerPerfilForm.js` (hero, rivales por partido desde `mis_cruces_partidos`), `GraficoPuntoAPunto.js`, `EstadisticasAvanzadasPerfil.js`, `DestacadosPerfil.js`, `lib/estadisticasAvanzadas.js` (`ganados`), i18n es/en/pt.
- **Datos:** sin SQL nuevo.
- **Por qué:** pedido del usuario: darle más importancia a las estadísticas en el perfil y que la lista diga contra quién se jugó.
- **Opciones mostradas (maqueta):** perfil A tablero / B forma reciente / C pantalla propia; lista A rivales en negrita / B marcador de TV / C resultado grande; encabezado del detalle y gráfico claro.
- **Elegida por el usuario:** perfil A, lista A, gráfico claro. Encabezado del detalle con los cuatro jugadores: sin definir (no se hizo).
- **Notas / qué mirar en la evaluación:** el cartel a 390 px, nombres de rivales largos en la lista, el gráfico con partidos muy parejos o muy pasados, que no quede repetido el resumen viejo al abrir "Ver todas".

### D-31 · `diseno-31-mis-partidos-y-games` — Mis partidos destacado y gráfico game por game (2026-10-09)

- **Qué cambió:**
  - **Mi perfil:** el link chico "Ver partidos" (no llamaba la atención) pasa a una barra de cartel "MIS PARTIDOS" con la cantidad en amarillo; el último partido queda siempre visible y "Ver todos" despliega el resto. Cada partido es una tarjeta como la de "Tu próximo partido" del Inicio: día en bloque amarillo, cartel verde con cancha, G/P, contra quién jugaste en negrita, sets en amarillo y puntos de ranking.
  - **Estadísticas del partido:** el gráfico de línea "Quién iba ganando" (D-30) no se entendía; se reemplaza por "Los games del partido": un cuadradito por game separados por set (verde = lo ganaste, rojo = lo ganó el rival, borde amarillo = tie-break) y tu mejor racha de games contra la del rival.
- **Pantallas afectadas:** Mi perfil, Estadísticas del partido.
- **Código:** `components/TarjetaPartidoPerfil.js` (nuevo), `VerPerfilForm.js`, `GraficoPuntoAPunto.js` (reescrito; conserva el nombre), `lib/estadisticasAvanzadas.js` (`grafico.secuencia`), i18n es/en/pt.
- **Datos:** sin SQL nuevo.
- **Opciones mostradas (maqueta):** gráfico A con escala / B set por set / C game por game; partidos A fecha amarilla + tarjeta verde / B tarjeta por resultado / C récord + filtros; perfil A botón amarillo / B barra de cartel / C últimos 3 + botón.
- **Elegida por el usuario:** gráfico C, perfil B (la pantalla Mis partidos aparte quedó sin cambios).
- **Notas / qué mirar en la evaluación:** partidos con muchos games (3 sets) a 390 px, tie-breaks y súper tie-break, nombres de rivales largos en la tarjeta.

### D-32 · `diseno-32-grupos-en-ranking` — grupos en el ranking de Jugadores (2026-10-09)

- **Qué cambió:** en Jugadores, los botoncitos "Global / grupo" (que solo aparecían si ya estabas en un grupo) pasan a tarjetas deslizables: una "Global" y una verde por grupo con tu puesto en grande ("2° de 8") y "a 40 pts de Mati" / "le sacás 90 pts a Gastón" / "empatado con…"; la tarjeta elegida lleva borde amarillo y cambia el ranking de abajo; al final, un "+" amarillo lleva a crear grupo. Sin grupos: cartel verde "Competí con tus amigos" y botón amarillo "Crear mi grupo".
- **Pantallas afectadas:** Jugadores / ranking.
- **Código:** `components/TarjetasGruposRanking.js` (nuevo; pide `ranking_grupo` por cada grupo, máx. 5), `DirectorioJugadoresForm.js`, i18n es/en/pt.
- **Datos:** sin SQL nuevo (usa `mis_grupos` y `ranking_grupo` de 069). Las tarjetas usan el período elegido (semanal cuenta como mensual).
- **Por qué:** pedido del usuario: fomentar la competencia entre amigos. Se descartó una "lista de amigos con estrella" (privada, no genera competencia) a favor de los grupos (tabla compartida).
- **Opciones mostradas (maqueta):** A pestañas Global / Mis grupos, B tarjetas de grupo para deslizar, C selector en cartel; más el estado sin grupos.
- **Elegida por el usuario:** B.
- **Notas / qué mirar en la evaluación:** nombres de grupo largos, 5 grupos (desliza bien a 390 px), el cartel sin grupos, que al volver a Global vuelva el semanal.

### D-33 · `diseno-33-como-venis-amarilla` — Cómo venís en amarillo y 7ª sin "(mínima)" (2026-10-09)

- **Qué cambió:** la tarjeta "Cómo venís" del perfil pasa de verde a amarilla con texto oscuro; los cuadraditos de forma: G en verde tablero con letra amarilla, P en rojo. El texto del nivel 7 pasa de "7ª (mínima)" a "7ª" en todas las pantallas (perfil, jugadores, crear partido, completar perfil).
- **Pantallas afectadas:** Mi perfil; textos de nivel en Jugadores, Crear partido, Completar perfil, Perfil de otro jugador.
- **Por qué:** pedido del usuario: "exceso de verde", la tarjeta se perdía con la del jugador.
- **Opciones mostradas (maqueta):** A amarilla, B blanca con borde, C solo líneas, D verde oscuro con franja amarilla.
- **Elegida por el usuario:** A.
- **Notas / qué mirar en la evaluación:** contraste del texto oscuro sobre amarillo en modo oscuro; que la tarjeta amarilla no compita con los botones amarillos de acción.

### D-34 · `diseno-34-i-con-pelota` — la i con la pelotita amarilla (2026-10-09)

- **Qué cambió:** en el título principal (h1) de cada pantalla, la primera I lleva arriba la pelotita amarilla de Padelito, como la i del logo. Una sola por título. No se pone si el título tiene una Í acentuada (Estadísticas…), ni en títulos que son nombres (cancha, grupo, torneo, conversación), ni en las pantallas de prueba.
- **Pantallas afectadas:** todas las que tienen título con I (Mis partidos, Privacidad, Invitaciones, Iniciar sesión, Grupos, Configuración, etc.).
- **Código:** `components/ConPelota.js` (nuevo), clase `.i-pelota` en `globals.css`, h1 envueltos en `<ConPelota>` (36 archivos).
- **Por qué:** pedido del usuario: un detalle de marca, "en algunos, no todos".
- **Opciones mostradas (maqueta):** A pelotita sobre la I de los títulos, B solo en la i minúscula de textos destacados, C solo la marca y festejos.
- **Elegida por el usuario:** A ("me parece prudente").
- **Notas / qué mirar en la evaluación:** títulos de 2 líneas (que la pelotita no toque la línea de arriba), títulos sobre cartel verde (login), modo oscuro.

### D-35 · `diseno-35-celu-cerca` — dónde dejar el celu (2026-10-09)

- **Qué cambió:** en la hoja "¿Cómo llevamos los puntos?" del Marcadorcito, abajo del detalle de cada modo, una línea con una canchita chica (el jugador y el celu en amarillo de su lado): "Dejá el celu cerca tuyo. Del lado donde jugás (revés o drive), en una silla o donde te quede a mano", más una frase según el modo (el reloj le llega mejor, te escucha mejor, te ve mejor la mano). En Manual no aparece.
- **Pantallas afectadas:** Marcadorcito, hoja de elegir modo.
- **Código:** `components/MarcadorForm.js` (`ElegirModo` + campo `consejo` en cada modo).
- **Por qué:** pedido del usuario: "lo mejor es que lo dejes del lado que vas… mientras más cerca mejor" (la voz llega a ~2 m y el reloj a ~9 m). Aclaró que no hace falta pegarlo al vidrio, alcanza con una silla.
- **Opciones mostradas (maqueta):** A consejo dentro de la hoja, B preguntar "¿De qué lado jugás?" y marcar el lugar en la canchita.
- **Elegida por el usuario:** A.
- **Notas / qué mirar en la evaluación:** que la hoja no quede más alta que la pantalla en celus chicos.

### D-36 · `diseno-36-pelotita-cada-pantalla` — al menos una pelotita por pantalla principal (2026-10-10)

- **Qué cambió:** la pelotita de la i (D-34) llega a las pantallas principales que no la tenían, siempre en textos que ya existían:
  - Inicio: "Abrir Marcadorcito", con la pelotita en verde porque el botón es amarillo (clase `.i-pelota-verde`, prop `verde` de `ConPelota`).
  - Jugadores: "Ranking" pasa de etiqueta chiquita a título de sección, con la pelotita en la I. "Jugadores" no tiene I.
  - Perfil: la barra "Mis partidos".
  - Marcadorcito: ya la tenía en el título. Ahora también va en el cartel del final, "Partido para…".
  - Imagen para compartir: "Partido ganado / perdido", con la i sin punto y la pelotita dibujada en el canvas.
- **Código:** `ConPelota.js` (prop `verde`), `globals.css`, `HomeForm.js`, `DirectorioJugadoresForm.js`, `VerPerfilForm.js`, `MarcadorForm.js`, `lib/tarjetaResultado.js`.
- **Por qué:** pedido del usuario: "que haya al menos uno por pantalla", en lugares que ya existen, sin crear vistas nuevas.
- **Elegida por el usuario:** sí (los tres propuestos, más al menos uno en Inicio y Jugadores).
- **Notas / qué mirar en la evaluación:** la pelotita verde sobre el botón amarillo del Inicio; "Ranking" más grande en Jugadores; la imagen para compartir en WhatsApp.

### D-37 · `diseno-37-barra-botones-iguales` — botones de la barra de abajo del mismo ancho (2026-10-10)

- **Qué cambió:** los 4 botones de la barra de abajo del celu (Home, Jugadores, Marcadorcito, Perfil) ahora miden lo mismo. Antes cada uno medía según su palabra, y la marca amarilla de la pantalla activa cambiaba de tamaño ("Marcadorcito" más ancho que "Home").
- **Código:** `components/BottomNav.js` (botones `flex-1`, texto con `truncate`).
- **Por qué:** pedido del usuario: "me parece que tienen distinto tamaño".
- **Opciones mostradas (maqueta):** antes / después.
- **Elegida por el usuario:** después ("dale aplica").
- **Notas / qué mirar en la evaluación:** en celus angostos, que "Marcadorcito" entre sin cortarse.

### D-38 · `diseno-38-marcadorcito-cartel-vs` — formulario del Marcadorcito con cartel VS (2026-10-10)

- **Qué cambió:**
  - Menos texto: salieron la explicación "Registrá un partido…", el texto de la demo y el consejo de dónde dejar el celu, que ya está en la hoja de elegir modo (D-35).
  - La demo pasa a un botoncito "Demo" al lado del título. El "Volver" salió, porque la barra de abajo ya lleva al Inicio.
  - Las parejas van en un cartel verde: "<tu nombre> y" + tu compañero, un VS grande en amarillo y los dos rivales. Los campos van con contorno punteado.
  - El punto de oro es un interruptor.
  - "Cargar un partido ya jugado" pasa al final, como link.
  - El botón "Empezar a jugar" queda igual (al usuario le encanta).
- **Código:** `components/MarcadorLibreForm.js` (`SlotJugador` con prop `oscuro`).
- **Por qué:** pedido del usuario: "tiene mucho texto, vamos a simplificar".
- **Opciones mostradas (maqueta):** A la cancha vista desde arriba, B cartel VS, C tablero de TV con 0-0.
- **Elegida por el usuario:** B.
- **Notas / qué mirar en la evaluación:** la lista de sugerencias de nombres al escribir, arriba del cartel verde; nombres largos en "<nombre> y"; modo oscuro.

### D-39 · `diseno-39-podio-escalones` — podio del ranking: escalones + festejo (2026-10-10)

- **Qué cambió:**
  - Las barras del podio de Jugadores ya tienen su altura real desde el principio. Antes crecía la altura y estiraba todo el cartel verde, con los nombres y los números saltando.
  - Ahora suben desde abajo una por una (3°, 2°, 1°), en unos 0,6 s en total. El número del 1° hace un "pop" amarillo al final.
  - Los puntos cuentan más rápido (0,45 s).
- **Código:** `DirectorioJugadoresForm.js` (`ColumnaPodio`), `.podio-pop` en `globals.css`.
- **Por qué:** pedido del usuario: "se ve re choto la animación… que se vea animado pero más rápido".
- **Opciones mostradas (maqueta animada):** A resorte, B escalones + festejo, C aparición sobria.
- **Elegida por el usuario:** B.
- **Notas / qué mirar en la evaluación:** cambiar de período o de grupo tiene que volver a animar sin que se vea bajar.

### D-40 · `diseno-40-duelo-grupo-inicio` — Inicio: cartel VS de tu grupo (2026-10-10)

- **Qué cambió:**
  - Debajo de "Crear partido / Abiertos" aparece "<grupo> · vas N°" y un cartel con "Vos" y tus puntos en verde, un VS amarillo y el rival con sus puntos.
  - El rival es el que tenés arriba en el grupo donde estás más cerca de pasarlo. Si vas 1° en todos, es el 2° del grupo donde menos le sacás.
  - Tocarlo abre Jugadores con ese grupo elegido (`/jugadores?grupo=<id>`).
  - Sin grupos, o si estás solo en los tuyos, no se muestra.
  - Usa el ranking mensual, como las tarjetas de grupo (D-32).
- **Código:** `DueloGrupoInicio.js` (nuevo), `HomeForm.js`, `DirectorioJugadoresForm.js` (lee `?grupo=`), `es.js`/`pt.js` (`grupos.vasPuesto`, `grupos.vos`).
- **Por qué:** fomentar la competencia entre amigos desde el Inicio.
- **Opciones mostradas (maqueta):** `docs/maquetas/maquetas-grupo-inicio.html`. Tandas 1 y 2 (A–F) descartadas; tanda 3: G cartel de luces, H calcomanía, I pie del próximo partido, J tablero del duelo, K frase gigante, L cartel VS.
- **Elegida por el usuario:** L, "y que si no tenés grupo no se muestre".
- **Notas / qué mirar en la evaluación:** nombres largos de grupo o de rival se cortan con "…".

### D-41 · `diseno-41-demo-modos-elegibles` — demo del Marcadorcito: modos para tocar (2026-10-10)

- **Qué cambió:** las cuatro pastillas de modo de la demo pasan a ser botones. Tocar uno lo deja fijo y la demo muestra cómo se juega con ese modo: la cápsula del reloj o de la seña de la cámara, y sus explicaciones en loop. Hasta que tocás uno, sigue pasando sola de modo en modo. Nuevo orden: Reloj, Cámara, Voz, Botones (antes Cámara, Voz, Reloj, Botones).
- **Código:** `DemoMarcadorForm.js`.
- **Por qué:** pedido del usuario: "que se puedan seleccionar los botones de cámara, voz, reloj o botones, que si marco uno me muestre cómo se juega", "que el orden sea reloj, cámara, voz y botones".
- **Opciones mostradas:** ninguna, el pedido era puntual.
- **Notas / qué mirar en la evaluación:** el modo elegido queda resaltado (`aria-pressed`).

### D-42 · `diseno-42-filtro-canchas` — Canchas: provincia, pastillas y buscador (2026-10-10)

- **Qué cambió:**
  - Debajo del título va la provincia en grande con "cambiar" al lado (abre la lista de provincias del celu). Arranca en la de tu perfil.
  - Hay un buscador por nombre, localidad o dirección.
  - Abajo, pastillas deslizables: "Todas" y cada localidad con cuántos clubes tiene, de más a menos.
  - En Buenos Aires hay primero pastillas verdes de región (Zona Norte, Oeste, Sur, La Plata, Costa, Interior) y, al elegir una, las de sus partidos.
  - Un renglón cuenta los clubes ("14 clubes en Maipú").
- **Código:** `CanchasListadoForm.js`, `lib/zonasPorProvincia.js` (`PROVINCIAS`, `regionDe`), textos `canchas.*` en es/pt/en.
- **Por qué:** ahora hay canchas de todo el país (088 ATC, 089 OpenStreetMap) y la pantalla solo mostraba las de tu provincia, sin filtro.
- **Opciones mostradas (maqueta):** `docs/maquetas/maquetas-filtro-canchas.html`: A dos desplegables, B pastillas con cantidad, C cerca mío + buscador.
- **Elegida por el usuario:** B + el buscador de C.
- **Notas / qué mirar en la evaluación:** en CABA el nombre de la provincia es largo y puede ocupar dos renglones.

### D-43 · `diseno-43-canchas-cabecera-verde` — Canchas: cabecera verde (2026-10-10)

- **Qué cambió:**
  - Arriba, un bloque verde con "Estás viendo", la provincia en grande y un botón amarillo "Cambiar" (abre la lista de provincias del celu).
  - El buscador va adentro del bloque, y debajo cuántos clubes y cuántas localidades hay (en la Ciudad dice barrios, en Buenos Aires partidos). Reemplaza al renglón "14 clubes en Maipú".
  - Las pastillas de región y de localidad quedan abajo del bloque, igual que en D-42. En la Ciudad y Buenos Aires la primera dice "Todos".
  - Cada club: nombre grande y, en una sola línea gris, localidad · dirección. A la derecha, la cantidad de canchas en número de marcador.
  - El teléfono sale de la lista (sigue en la ficha del club, con WhatsApp).
- **Código:** `CanchasListadoForm.js`, textos `canchas.*` en es/pt/en (se fueron `nClubes`, `unClub`, `nClubesEn`, `unClubEn`).
- **Por qué:** al usuario D-42 le pareció fea ("quedó muy feo").
- **Opciones mostradas (maqueta):** `docs/maquetas/maquetas-canchas-linda.html`: M cabecera verde, N agrupado por localidad, O cartel y botón Filtrar.
- **Elegida por el usuario:** M.
- **Notas / qué mirar en la evaluación:** "Ciudad Autónoma de Buenos Aires" ocupa dos o tres renglones en el bloque; el amarillo "Cambiar" sigue el color de acción del tema.

### D-44 · `diseno-44-cancha-sin-resenas` — Ficha del club sin reseñas (2026-10-10)

- **Qué cambió:**
  - Se sacaron las reseñas de la ficha del club: el puntaje promedio, la lista y el formulario para dejar una.
  - En su lugar, un botón amarillo "Ver en Google Maps" que abre el club en Maps (ahí están las opiniones).
  - La dirección ya no es un enlace: el botón la reemplaza.
  - Arreglo: el enlace a Maps le sumaba siempre "Mendoza". Ahora busca "nombre, localidad" con el mapa centrado en las coordenadas del club (sin coordenadas: nombre, localidad y provincia). Probado con 46 clubes al azar, 2 por provincia, de ATC y OpenStreetMap: con el nombre solo abrió la ficha en 30; sumar la localidad arregló 4 de los 8 que quedaban en lista. En 2 (Tamarindos, San Luis; Amín Padel, Santiago del Estero) Maps abre otro club, probablemente porque las coordenadas de ATC están mal.
- **Código:** `DetalleCanchaForm.js`, textos `detalleCancha.*` en es/pt/en (fuera las de reseñas, nuevo `verEnMaps`). La tabla `resenas_canchas` queda en la base sin usar.
- **Por qué:** pedido del usuario: las reseñas ya están en Google Maps.
- **Opciones mostradas (maqueta):** ninguna; pedido directo.
- **Elegida por el usuario:** sacar las reseñas.
- **Notas / qué mirar en la evaluación:** que el botón abra el club correcto en canchas de otras provincias.

### D-45 · `diseno-45-jugadores-ejemplo-y-ficha-usuario` — Jugadores de ejemplo y ficha por usuario (2026-10-10)

- **Qué cambió:**
  - Los jugadores demo vuelven al directorio, el ranking y su perfil con una etiqueta chica gris "Ejemplo" al lado del nombre (en el podio, versión clara sobre el verde).
  - En el perfil de un jugador de ejemplo: la etiqueta, la aclaración "Jugador de ejemplo para mostrar cómo funciona Padelito. No es una persona real…", y sin botones de mensaje, frecuente, felicitar ni invitar.
  - No aparecen en buscadores, invitaciones, compañero fijo, grupos ni sugerencias (siguen inactivos en la base).
  - Estadísticas (/admin/estadisticas, solo superusuario): sección "Quiénes son" (por provincia, barra de género con %, barras por nivel) y en la lista de usuarios, provincia y género; tocando un usuario se abre su ficha (perfil, alta, última vez, días activos, minutos, minutos por día, partidos, grupos, torneos, mensajes enviados, frecuentes, fallas, modo de marcador, pantallas más abiertas, dispositivos, si llegó por /probar). Siguen siendo "Usuario N", sin nombre, mail ni teléfono, como dice la política de privacidad.
- **Código:** `DirectorioJugadoresForm.js` (`EtiquetaEjemplo`), `PerfilJugadorForm.js`, `AdminEstadisticasForm.js` (`FichaUsuario`), textos `directorio.ejemplo` y `perfilJugador.ejemploAviso` en es/pt/en; SQL 094.
- **Por qué:** sin los demo la app quedaba vacía ("no me gusta que quede tan vacío"), pero sin engañar a nadie; y el usuario quiere conocer a cada persona que se une.
- **Opciones mostradas (maqueta):** `docs/maquetas/maquetas-marca-demo.html`: X etiqueta "Ejemplo", Y nombre en gris y cursiva, Z etiqueta y sin puesto; y la maqueta de estadísticas.
- **Elegida por el usuario:** X ("dejá lo del ejemplo") + la aclaración en el perfil.
- **Notas / qué mirar en la evaluación:** que la etiqueta no corte nombres largos en el podio; que la ficha se lea bien en el celu.

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
| Torneos (lista, nuevo, detalle) | `/torneos` | | | | | |
| Cargar un partido jugado | `/cargar-partido` | | | | | |
| Inicio para visitantes | `/` sin cuenta | | | | | |
| Hojas de abajo (opciones, filtros, etc.) | varias | | | | | |
| Vista en compu (Inicio) | `/` en pantalla grande | | | | | |
