// Estadísticas de Marcadorcito (app/backend/sql/047_estadisticas_partido.sql):
// se guardan por EQUIPO, no por jugador -- estas funciones las traducen al
// punto de vista de UN jugador puntual (mío vs. rival) según de qué lado
// jugó en ese partido. Compartido entre VerPerfilForm.js (resumen general +
// lista de partidos) y EstadisticasPartidoForm.js (detalle de un partido).

// Lee `estadisticas_partido` desde el punto de vista de este jugador.
export function estadisticasDeLado(stats, miEquipo) {
  const mio = miEquipo === "B" ? "b" : "a";
  const rival = mio === "a" ? "b" : "a";
  return {
    duracionMin: Math.round(stats.duracion_ms / 60000),
    // "conv" = quiebres/puntos de juego REALMENTE convertidos; "op" =
    // oportunidades que hubo (se hayan convertido o no) -- se muestran
    // los dos por separado (a pedido del usuario: "que veamos todo lo
    // que se pueda parametrizar").
    sacoPrimeroYo: stats.saca_primero === miEquipo,
    quiebresFavor: stats[`quiebres_conv_${mio}`],
    quiebresContra: stats[`quiebres_conv_${rival}`],
    quiebresOpFavor: stats[`quiebres_op_${mio}`],
    quiebresOpContra: stats[`quiebres_op_${rival}`],
    puntosJuegoFavor: stats[`puntos_juego_conv_${mio}`],
    puntosJuegoContra: stats[`puntos_juego_conv_${rival}`],
    puntosJuegoOpFavor: stats[`puntos_juego_op_${mio}`],
    puntosJuegoOpContra: stats[`puntos_juego_op_${rival}`],
    racha: stats[`racha_max_${mio}`],
    rachaRival: stats[`racha_max_${rival}`],
    puntosPropios: stats[`puntos_totales_${mio}`],
    puntosRival: stats[`puntos_totales_${rival}`],
    juegosADeuce: stats.games_en_deuce,
  };
}

// Suma/promedia `estadisticasDeLado` de todos los partidos -- el resumen
// general que se ve arriba de la lista de partidos, en el perfil.
export function calcularResumenEstadisticas(partidos) {
  if (partidos.length === 0) return null;

  let sumaDuracionMs = 0;
  let quiebresFavor = 0;
  let quiebresContra = 0;
  let quiebresOpFavor = 0;
  let quiebresOpContra = 0;
  let puntosJuegoFavor = 0;
  let puntosJuegoContra = 0;
  let puntosJuegoOpFavor = 0;
  let puntosJuegoOpContra = 0;
  let rachaMaxima = 0;
  let sumaPuntosPropios = 0;
  let sumaPuntosRival = 0;
  let juegosADeuce = 0;
  let partidosGanados = 0;
  let saquePrimeroCount = 0;

  for (const p of partidos) {
    const d = estadisticasDeLado(p.stats, p.miEquipo);
    sumaDuracionMs += p.stats.duracion_ms;
    quiebresFavor += d.quiebresFavor;
    quiebresContra += d.quiebresContra;
    quiebresOpFavor += d.quiebresOpFavor;
    quiebresOpContra += d.quiebresOpContra;
    puntosJuegoFavor += d.puntosJuegoFavor;
    puntosJuegoContra += d.puntosJuegoContra;
    puntosJuegoOpFavor += d.puntosJuegoOpFavor;
    puntosJuegoOpContra += d.puntosJuegoOpContra;
    rachaMaxima = Math.max(rachaMaxima, d.racha);
    sumaPuntosPropios += d.puntosPropios;
    sumaPuntosRival += d.puntosRival;
    juegosADeuce += d.juegosADeuce;
    if (p.gane) partidosGanados += 1;
    if (d.sacoPrimeroYo) saquePrimeroCount += 1;
  }

  const n = partidos.length;
  return {
    partidos: n,
    partidosGanados,
    duracionPromedioMin: Math.round(sumaDuracionMs / n / 60000),
    quiebresFavor,
    quiebresContra,
    quiebresOpFavor,
    quiebresOpContra,
    puntosJuegoFavor,
    puntosJuegoContra,
    puntosJuegoOpFavor,
    puntosJuegoOpContra,
    rachaMaxima,
    sumaPuntosPropios,
    sumaPuntosRival,
    promedioPropios: Math.round(sumaPuntosPropios / n),
    promedioRival: Math.round(sumaPuntosRival / n),
    juegosADeuce,
    saquePrimeroCount,
  };
}

// El resultado por set vive en `resultados_partido.estado` (jsonb con
// setsA/setsB, ver 009_us2_7_marcador_en_vivo.sql) -- lo pasamos también al
// punto de vista de este jugador y lo devolvemos ya formateado ("6-4  ·
// 3-6  ·  7-5"). Un set que nunca se jugó queda 0-0 en el array (por el
// default de la columna) y se descarta.
export function formatoSets(estado, miEquipo) {
  if (!estado?.setsA || !estado?.setsB) return null;
  const propios = miEquipo === "B" ? estado.setsB : estado.setsA;
  const rivales = miEquipo === "B" ? estado.setsA : estado.setsB;
  const pares = propios
    .map((mio, i) => [mio, rivales[i] ?? 0])
    .filter(([a, b]) => a !== 0 || b !== 0);
  if (pares.length === 0) return null;
  return pares.map(([a, b]) => `${a}-${b}`).join("  ·  ");
}

// Racha de SEMANAS jugando Marcadorcito seguidas (2026-09-13, a pedido del
// usuario, inspirado en el research de gamificación: "la racha es la
// razón #1 de volver a abrir la app" en Duolingo) -- no confundir con
// "racha máxima de puntos" (consecutivos DENTRO de un partido). Si esta
// semana calendario (lunes a domingo) todavía no jugó nada, la racha sigue
// viva contando desde la semana pasada (no se corta hasta que termina la
// semana sin jugar), igual que un streak de hábito.
function inicioDeSemana(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diffALunes = dia === 0 ? 6 : dia - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffALunes);
  return d.getTime();
}

export function calcularRachaSemanas(partidos) {
  if (!partidos || partidos.length === 0) return 0;
  const semanasConPartido = new Set(partidos.map((p) => inicioDeSemana(p.fechaHora)));
  const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;
  const semanaActual = inicioDeSemana(new Date());

  let cursor = semanasConPartido.has(semanaActual) ? semanaActual : semanaActual - MS_SEMANA;
  let racha = 0;
  while (semanasConPartido.has(cursor)) {
    racha++;
    cursor -= MS_SEMANA;
  }
  return racha;
}

// Puntos de ranking que este partido le sumó al jugador -- misma fórmula
// que el trigger aplicar_resultado_partido (009_us2_7_marcador_en_vivo.sql,
// aplicada de verdad en perfiles.puntos_ranking al finalizar el partido):
// 2 puntos por cada game ganado + 5 de bono si ganó el partido. Se
// recalcula acá solo para MOSTRARLO en el detalle (2026-09-13, a pedido
// del usuario) -- no vuelve a escribir nada.
export function calcularPuntosRanking(estado, miEquipo, gane) {
  if (!estado?.setsA || !estado?.setsB) return null;
  const propios = miEquipo === "B" ? estado.setsB : estado.setsA;
  const gamesGanados = propios.reduce((acc, g) => acc + (g || 0), 0);
  return gamesGanados * 2 + (gane ? 5 : 0);
}
