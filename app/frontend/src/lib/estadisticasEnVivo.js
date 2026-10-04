// Estadísticas de un partido jugado con el Marcadorcito real (2026-10-04).
// El marcador anota una entrada por punto dentro de estado.log y, al terminar
// el partido, de ahí salen los números que se guardan en estadisticas_partido
// (ver 047_estadisticas_partido.sql). Cada entrada es un texto corto:
//   "<quién ganó><quién sacaba><banderas>.<segundos>", ej. "AB18.42"
// (los segundos son lo que pasó desde el punto anterior; los registros
// viejos no los traen).
import { sumarPunto } from "@/lib/marcadorEngine";

const F_QUIEBRE_OP = 1; // el que resta podía quebrar con este punto
const F_QUIEBRE_CONV = 2; // ...y lo ganó: quiebre
const F_JUEGO_OP = 4; // el que saca podía cerrar el game con este punto
const F_JUEGO_CONV = 8; // ...y lo cerró
const F_FIN_GAME = 16; // con este punto terminó el game
const F_DEUCE = 32; // se jugó con 40-40 o más
const F_TIEBREAK = 64; // punto de tie-break

const otro = (l) => (l === "A" ? "B" : "A");

// `core` es el estado ANTES del punto (el mismo que arma handleSumarPunto).
export function entradaDePunto(core, lado, config, eventos, segundos = 0) {
  const sacador = core.saque;
  let banderas = 0;
  if (core.tiebreak) {
    banderas |= F_TIEBREAK;
  } else {
    const receptor = otro(sacador);
    const cierra = (quien) => sumarPunto(core, quien, config).eventos.some((e) => e.tipo === "juego" && e.ganador === quien);
    const termina = eventos.some((e) => e.tipo === "juego");
    if (cierra(receptor)) banderas |= F_QUIEBRE_OP;
    if (cierra(sacador)) banderas |= F_JUEGO_OP;
    if (termina) {
      banderas |= F_FIN_GAME;
      if (lado === receptor) banderas |= F_QUIEBRE_CONV;
      else banderas |= F_JUEGO_CONV;
    }
    if (core.puntosA >= 3 && core.puntosB >= 3) banderas |= F_DEUCE;
  }
  return `${lado}${sacador}${banderas}.${Math.max(0, Math.min(999, Math.round(segundos)))}`;
}

function leer(entrada) {
  const [banderas, segundos] = entrada.slice(2).split(".");
  return { lado: entrada[0], sacador: entrada[1], banderas: Number(banderas), segundos: Number(segundos ?? 0) || 0 };
}

// Devuelve las columnas de estadisticas_partido (sin partido_id).
export function estadisticasDeLog(log, duracionMs) {
  const r = {
    duracion_ms: Math.max(0, Math.round(duracionMs)),
    saca_primero: log.length ? leer(log[0]).sacador : null,
    puntos_totales_a: 0,
    puntos_totales_b: 0,
    quiebres_conv_a: 0,
    quiebres_op_a: 0,
    quiebres_conv_b: 0,
    quiebres_op_b: 0,
    puntos_juego_conv_a: 0,
    puntos_juego_op_a: 0,
    puntos_juego_conv_b: 0,
    puntos_juego_op_b: 0,
    racha_max_a: 0,
    racha_max_b: 0,
    games_en_deuce: 0,
    punto_mas_largo_s: 0,
  };
  let racha = { lado: null, largo: 0 };
  let gameConDeuce = false;
  let anteriorCerroGame = true;
  for (const entrada of log) {
    const { lado, sacador, banderas, segundos } = leer(entrada);
    const receptor = otro(sacador);
    r[`puntos_totales_${lado.toLowerCase()}`]++;

    racha = lado === racha.lado ? { lado, largo: racha.largo + 1 } : { lado, largo: 1 };
    const claveRacha = `racha_max_${lado.toLowerCase()}`;
    if (racha.largo > r[claveRacha]) r[claveRacha] = racha.largo;

    // Punto más largo (aproximado): el mayor tiempo entre dos puntos seguidos
    // del mismo game. No cuenta el cambio de lado ni las pausas largas
    // (más de 2 minutos). Incluye el tiempo de preparar el saque.
    if (!anteriorCerroGame && segundos > 0 && segundos <= 120 && segundos > r.punto_mas_largo_s) r.punto_mas_largo_s = segundos;
    anteriorCerroGame = !!(banderas & F_FIN_GAME);

    if (banderas & F_QUIEBRE_OP) r[`quiebres_op_${receptor.toLowerCase()}`]++;
    if (banderas & F_QUIEBRE_CONV) r[`quiebres_conv_${receptor.toLowerCase()}`]++;
    if (banderas & F_JUEGO_OP) r[`puntos_juego_op_${sacador.toLowerCase()}`]++;
    if (banderas & F_JUEGO_CONV) r[`puntos_juego_conv_${sacador.toLowerCase()}`]++;
    if (banderas & F_DEUCE) gameConDeuce = true;
    if (banderas & F_FIN_GAME) {
      if (gameConDeuce) r.games_en_deuce++;
      gameConDeuce = false;
    }
  }
  return r;
}
