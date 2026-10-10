// Estadísticas avanzadas de Marcadorcito (D-29, 2026-10-08): todo lo que se
// puede sacar del registro punto por punto que el marcador guarda en
// `resultados_partido.estado.log` (ver lib/estadisticasEnVivo.js). Cada
// entrada del log es "<quién ganó><quién sacaba><banderas>.<segundos>", ej.
// "AB18.42" -- los segundos son lo que pasó desde el punto anterior.
//
// Funciones PURAS, sin React ni Supabase y sin imports (para poder probarlas
// sueltas con node). Todo se calcula POR PAREJA: la app solo sabe qué pareja
// ganó cada punto, no qué jugador. "Yo" = la pareja del usuario logueado
// (miEquipo, "A" o "B"), igual que en estadisticasMarcadorcito.js.
//
// Cómo se reconstruye el tanteo: NO se vuelve a jugar el partido con
// sumarPunto (el anotador puede haber corregido games/puntos a mano o cambiado
// el punto de oro a mitad de partido, y eso no queda en el log). Se usan las
// banderas que anotó el marcador en vivo, que son la verdad de lo que pasó:
// F_FIN_GAME marca el punto que cerró cada game y F_TIEBREAK los puntos de
// tie-break. Los puntos de cada game se cuentan desde el último F_FIN_GAME.
// Si hubo una corrección manual a mitad de un game, ese game puede quedar
// con un tanteo intermedio raro; es un caso muy poco común y se acepta.

// Mismas banderas que lib/estadisticasEnVivo.js (copiadas para que este
// archivo no tenga imports).
const F_FIN_GAME = 16;
const F_TIEBREAK = 64;

// Topes para el tiempo de cada game (segundos entre puntos). El primer punto
// de cada game trae también el descanso / cambio de lado, así que se cuenta
// como mucho 30 s; cualquier otro intervalo de más de 2 min es una pausa y se
// cuenta como 2 min.
const TOPE_PRIMER_PUNTO_S = 30;
const TOPE_PUNTO_S = 120;

// Mínimo de partidos para mostrar un grupo (compañero, franja, día, cancha):
// con 1 solo partido cualquier porcentaje es 0% o 100%.
const MINIMO_GRUPO = 2;

export const ZONA_HORARIA = "America/Argentina/Mendoza";

function leer(entrada) {
  const s = String(entrada ?? "");
  const [banderas, segundos] = s.slice(2).split(".");
  return { lado: s[0], sacador: s[1], banderas: Number(banderas) || 0, segundos: Number(segundos ?? 0) || 0 };
}

// Igual que setDecidido de lib/marcadorEngine.js.
function setDecidido(gA, gB) {
  const max = Math.max(gA, gB);
  const min = Math.min(gA, gB);
  if (max >= 6 && max - min >= 2) return true;
  if (max === 7 && min >= 5) return true;
  return false;
}

const fraccion = () => ({ g: 0, n: 0 });
const sumarA = (f, gano) => {
  f.n += 1;
  if (gano) f.g += 1;
};
export const porcentaje = (f) => (f && f.n > 0 ? Math.round((f.g / f.n) * 100) : null);

// "Estás abajo" en un game (antes de jugar un punto), visto desde la pareja
// con `mios` puntos contra `suyos` (0, 1, 2, 3 = 0/15/30/40; 4+ = ventajas):
//  - el rival está en 30 o más y te lleva 2 puntos o más (0-30, 15-40, 0-40), o
//  - el rival tiene punto de juego (30-40, 40-ventaja).
// En punto de oro, 40-40 NO cuenta: ahí los dos tienen punto de juego.
export function estaAbajo(mios, suyos) {
  return (suyos >= 2 && suyos - mios >= 2) || (suyos >= 3 && suyos > mios);
}

/**
 * Analiza el log de UN partido desde el punto de vista de `miEquipo`.
 * Devuelve null si el partido no tiene registro punto por punto (partidos
 * viejos o cargados a mano).
 *
 * Definiciones (las mismas que explican los (?) de la pantalla):
 * - Saque: un game "con tu saque" es uno en el que sacaba tu pareja; se
 *   cuentan solo los games normales (los tie-breaks no tienen un único
 *   sacador). "Quiebres" = games que ganaste con saque del rival. Los % de
 *   puntos ganados sacando / restando sí incluyen los puntos de tie-break
 *   (el log guarda quién sacó cada punto).
 * - Puntos de presión: puntos jugados en 30-30, en iguales o con ventaja
 *   (40-40, ventaja de cualquiera) y el punto de oro (40-40 con punto de
 *   oro: ese punto cierra el game). Sin tie-breaks.
 * - Remontadas: games que ganaste después de estar abajo (ver estaAbajo:
 *   0-30, 15-40, 0-40, 30-40 o el rival con ventaja). "De Y" = en cuántos
 *   games estuviste abajo.
 * - Te dieron vuelta: el espejo -- games que perdiste después de estar
 *   arriba así. "De Y" = en cuántos games estuviste arriba.
 *   Así no se pisan: una mide lo que levantaste, la otra lo que se te escapó.
 * - Ritmo: duración de cada game normal sumando el tiempo entre puntos (con
 *   los topes de arriba); el game más largo es el de más puntos (si empatan,
 *   el que más duró).
 */
export function analizarPartido(log, miEquipo) {
  if (!Array.isArray(log) || log.length === 0 || (miEquipo !== "A" && miEquipo !== "B")) return null;
  const entradas = log.map(leer).filter((e) => (e.lado === "A" || e.lado === "B") && (e.sacador === "A" || e.sacador === "B"));
  if (entradas.length === 0) return null;

  const saque = {
    juegosSacando: fraccion(), // games con mi saque: g = los gané (saque retenido)
    juegosRestando: fraccion(), // games con saque rival: g = los gané (quiebres)
    puntosSacando: fraccion(),
    puntosRestando: fraccion(),
  };
  const presion = { a3030: fraccion(), iguales: fraccion(), oro: fraccion(), total: fraccion() };
  const remontadas = fraccion(); // n = games en que estuve abajo; g = los gané igual
  const teDieronVuelta = fraccion(); // n = games en que estuve arriba; g = los perdí igual

  // Para el gráfico: diferencia acumulada (yo - rival) después de cada punto,
  // empezando en 0 antes del primer punto.
  const difs = [0];
  const finesDeGame = []; // índice (en difs) donde terminó cada game
  const sets = []; // { desde, hasta, mios, rival, superTiebreak }
  const games = []; // games normales: { puntos, segundos, gane, set, marcador }
  // Todos los games en orden, tie-breaks incluidos (cada uno cuenta como 1):
  // { set, gane, tiebreak } -- para el dibujo "game por game".
  const secuencia = [];

  let setIdx = 0;
  let desdeSet = 0;
  let gY = 0;
  let gR = 0;
  let pY = 0;
  let pR = 0;
  let enTiebreak = false;
  let tiebreakHasta = 7;
  let dif = 0;
  let juego = null; // game normal en curso
  let conTiempos = false;

  const cerrarSet = (i, mios, rival, superTiebreak = false) => {
    sets.push({ desde: desdeSet, hasta: i, mios, rival, superTiebreak });
    desdeSet = i;
    setIdx += 1;
    gY = 0;
    gR = 0;
  };

  entradas.forEach((e, idx) => {
    const yoGane = e.lado === miEquipo;
    const yoSaco = e.sacador === miEquipo;
    const tiebreak = !!(e.banderas & F_TIEBREAK);
    if (e.segundos > 0) conTiempos = true;
    sumarA(yoSaco ? saque.puntosSacando : saque.puntosRestando, yoGane);
    dif += yoGane ? 1 : -1;
    difs.push(dif);
    const i = idx + 1; // índice en difs DESPUÉS de este punto

    if (tiebreak) {
      if (!enTiebreak) {
        enTiebreak = true;
        // Súper tie-break: arranca el 3er set directo, sin games jugados.
        tiebreakHasta = setIdx >= 2 && gY === 0 && gR === 0 ? 10 : 7;
        pY = 0;
        pR = 0;
        juego = null;
      }
      if (yoGane) pY += 1;
      else pR += 1;
      if (Math.max(pY, pR) >= tiebreakHasta && Math.abs(pY - pR) >= 2) {
        finesDeGame.push(i);
        const esSuper = tiebreakHasta === 10;
        const gane = pY > pR;
        secuencia.push({ set: setIdx + 1, gane, tiebreak: true });
        cerrarSet(i, esSuper ? pY : gane ? gY + 1 : gY, esSuper ? pR : gane ? gR : gR + 1, esSuper);
        enTiebreak = false;
        pY = 0;
        pR = 0;
      }
      return;
    }

    if (enTiebreak) {
      // Tie-break que no llegó a cerrarse en el log (corrección manual):
      // se abandona y se sigue con games normales.
      enTiebreak = false;
      pY = 0;
      pR = 0;
    }
    if (!juego) {
      juego = { sacoYo: yoSaco, puntos: 0, segundos: 0, abajo: false, arriba: false, set: setIdx + 1, marcador: `${gY}-${gR}` };
    }

    // Situación ANTES de jugar el punto.
    if (estaAbajo(pY, pR)) juego.abajo = true;
    if (estaAbajo(pR, pY)) juego.arriba = true;
    const finGame = !!(e.banderas & F_FIN_GAME);
    if (pY === 2 && pR === 2) sumarA(presion.a3030, yoGane);
    else if (pY >= 3 && pR >= 3) {
      // 40-40 que cierra el game = se jugaba con punto de oro.
      if (pY === pR && finGame) sumarA(presion.oro, yoGane);
      else sumarA(presion.iguales, yoGane);
    }
    if ((pY === 2 && pR === 2) || (pY >= 3 && pR >= 3)) sumarA(presion.total, yoGane);

    juego.segundos += Math.min(e.segundos, juego.puntos === 0 ? TOPE_PRIMER_PUNTO_S : TOPE_PUNTO_S);
    juego.puntos += 1;
    if (yoGane) pY += 1;
    else pR += 1;

    if (finGame) {
      finesDeGame.push(i);
      sumarA(juego.sacoYo ? saque.juegosSacando : saque.juegosRestando, yoGane);
      if (juego.abajo) sumarA(remontadas, yoGane);
      if (juego.arriba) sumarA(teDieronVuelta, !yoGane);
      games.push({ puntos: juego.puntos, segundos: juego.segundos, gane: yoGane, set: juego.set, marcador: juego.marcador });
      secuencia.push({ set: juego.set, gane: yoGane, tiebreak: false });
      juego = null;
      pY = 0;
      pR = 0;
      if (yoGane) gY += 1;
      else gR += 1;
      if (!(gY === 6 && gR === 6) && setDecidido(gY, gR)) cerrarSet(i, gY, gR);
    }
  });

  // Set que quedó abierto al final del log (partido terminado por los
  // games corregidos a mano, o sin terminar).
  if (desdeSet < difs.length - 1) {
    sets.push({ desde: desdeSet, hasta: difs.length - 1, mios: gY, rival: gR, superTiebreak: false, abierto: true });
  }

  let masLargo = null;
  for (const g of games) {
    if (!masLargo || g.puntos > masLargo.puntos || (g.puntos === masLargo.puntos && g.segundos > masLargo.segundos)) masLargo = g;
  }
  const sumaSeg = games.reduce((acc, g) => acc + g.segundos, 0);

  // Mayor ventaja propia y del rival a lo largo del partido (para el gráfico).
  let maxVentaja = 0;
  let maxDesventaja = 0;
  for (const d of difs) {
    if (d > maxVentaja) maxVentaja = d;
    if (d < maxDesventaja) maxDesventaja = d;
  }

  return {
    grafico: { difs, finesDeGame, sets, maxVentaja, maxDesventaja, secuencia },
    saque,
    presion,
    remontadas,
    teDieronVuelta,
    ritmo: {
      games: games.length,
      conTiempos,
      promedioS: conTiempos && games.length > 0 ? Math.round(sumaSeg / games.length) : null,
      masLargo,
    },
  };
}

// ---------------------------------------------------------------------------
// Rachas de PARTIDOS (no de puntos): cuántos partidos seguidos ganaste o
// perdiste. `resultados` = booleans (true = gané), del más nuevo al más viejo.
export function calcularRachas(resultados) {
  const lista = (resultados ?? []).filter((r) => typeof r === "boolean");
  if (lista.length === 0) return null;
  let actual = 0;
  while (actual < lista.length && lista[actual] === lista[0]) actual += 1;
  let mejorGanando = 0;
  let peorPerdiendo = 0;
  let corrida = 0;
  for (let i = 0; i < lista.length; i++) {
    corrida = i > 0 && lista[i] === lista[i - 1] ? corrida + 1 : 1;
    if (lista[i]) mejorGanando = Math.max(mejorGanando, corrida);
    else peorPerdiendo = Math.max(peorPerdiendo, corrida);
  }
  return { actual: { gane: lista[0], n: actual }, mejorGanando, peorPerdiendo };
}

// Nivel de la racha (pedido del usuario, 2026-10-08). Devuelve la clave i18n
// (dentro de "avanzadas.") o null si es 1 partido. Ganando: 2 En racha,
// 3 Encendido, 4 Imparable, 5+ Leyenda. Perdiendo (siempre para arriba,
// nunca para gastar): 2 Mala racha, 3 A remontar, 4+ Toca dar vuelta la historia.
export function nivelRacha(gane, n) {
  if (!n || n < 2) return null;
  if (gane) {
    if (n >= 5) return "nivelLeyenda";
    if (n === 4) return "nivelImparable";
    if (n === 3) return "nivelEncendido";
    return "nivelEnRacha";
  }
  if (n >= 4) return "nivelDarVuelta";
  if (n === 3) return "nivelARemontar";
  return "nivelMalaRacha";
}

// Texto de la racha (perfil e Inicio): "Imparable · 4 seguidos" o, con 1
// partido, "Ganaste el último". `t` es el traductor de useLocale.
export function textoRacha(t, gane, n) {
  const nivel = nivelRacha(gane, n);
  if (!nivel) return t(gane ? "avanzadas.ganasteElUltimo" : "avanzadas.perdisteElUltimo");
  return t("avanzadas.nivelSeguidos", { nivel: t(`avanzadas.${nivel}`), n });
}

// ---------------------------------------------------------------------------
// Hora y día del partido en Mendoza (no en la zona del celu).
export function horaYDia(fechaHora) {
  const d = new Date(fechaHora);
  if (Number.isNaN(d.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_HORARIA, hour: "numeric", hourCycle: "h23", weekday: "short" }).formatToParts(d);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.find((p) => p.type === "weekday")?.value);
  return { hora, dia };
}

// mañana < 13 h, tarde 13 a 19 h, noche desde las 19 h.
export function franjaHoraria(hora) {
  if (hora < 13) return "manana";
  if (hora < 19) return "tarde";
  return "noche";
}

function setsJugados(estado) {
  if (!Array.isArray(estado?.setsA) || !Array.isArray(estado?.setsB)) return 0;
  return estado.setsA.filter((g, i) => (g || 0) !== 0 || (estado.setsB[i] || 0) !== 0).length;
}

function agrupar(mapa, clave, base, gane) {
  const g = mapa.get(clave) ?? { ...base, g: 0, pj: 0 };
  g.pj += 1;
  if (gane) g.g += 1;
  mapa.set(clave, g);
}

const conMinimo = (mapa) =>
  [...mapa.values()]
    .filter((x) => x.pj >= MINIMO_GRUPO)
    .sort((a, b) => b.g / b.pj - a.g / a.pj || b.pj - a.pj);

const sumarFraccion = (a, b) => {
  a.g += b.g;
  a.n += b.n;
};

function acumular(analisis) {
  const r = { sacando: fraccion(), restando: fraccion(), presion: fraccion(), remontadas: fraccion(), teDieronVuelta: fraccion() };
  for (const a of analisis) {
    sumarFraccion(r.sacando, a.saque.juegosSacando);
    sumarFraccion(r.restando, a.saque.juegosRestando);
    sumarFraccion(r.presion, a.presion.total);
    sumarFraccion(r.remontadas, a.remontadas);
    sumarFraccion(r.teDieronVuelta, a.teDieronVuelta);
  }
  return r;
}

/**
 * Estadísticas acumuladas del perfil.
 * `partidos`: [{ id, fechaHora, cancha, miEquipo, gane, estado }] -- solo
 * partidos TERMINADOS (con o sin log; los que no tienen log cuentan para
 * rachas, horarios, canchas y 3 sets, pero no para saque/presión).
 * `companeroPorPartido`: { [partidoId]: { clave, nombre } } (sale de
 * mis_cruces_partidos, ver destacadosPerfil.js); puede venir vacío.
 */
export function calcularAvanzadasPerfil(partidos, companeroPorPartido = {}) {
  const lista = [...(partidos ?? [])]
    .filter((p) => typeof p.gane === "boolean")
    .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
  if (lista.length === 0) return null;

  const rachas = calcularRachas(lista.map((p) => p.gane));

  // Del más nuevo al más viejo, solo los que tienen log.
  const conLog = lista
    .map((p) => ({ p, a: analizarPartido(p.estado?.log, p.miEquipo) }))
    .filter((x) => x.a);
  const total = acumular(conLog.map((x) => x.a));

  // Tendencia: últimos 5 partidos con log contra todos los anteriores (hacen
  // falta al menos 2 anteriores para comparar). Diferencia en puntos de %.
  let tendencia = null;
  if (conLog.length >= 7) {
    const ult = acumular(conLog.slice(0, 5).map((x) => x.a));
    const ant = acumular(conLog.slice(5).map((x) => x.a));
    const delta = (f1, f2) => (porcentaje(f1) !== null && porcentaje(f2) !== null ? porcentaje(f1) - porcentaje(f2) : null);
    tendencia = { sacando: delta(ult.sacando, ant.sacando), restando: delta(ult.restando, ant.restando), anteriores: conLog.length - 5 };
  }

  // Por compañero (2+ partidos con log juntos), los que más jugaste primero.
  const porCompanero = new Map();
  for (const { p, a } of conLog) {
    const c = companeroPorPartido?.[p.id];
    if (!c) continue;
    const x = porCompanero.get(c.clave) ?? { nombre: c.nombre, pj: 0, g: 0, sacando: fraccion(), presion: fraccion() };
    x.pj += 1;
    if (p.gane) x.g += 1;
    sumarFraccion(x.sacando, a.saque.juegosSacando);
    sumarFraccion(x.presion, a.presion.total);
    porCompanero.set(c.clave, x);
  }
  const companeros = [...porCompanero.values()]
    .filter((x) => x.pj >= MINIMO_GRUPO)
    .sort((a, b) => b.pj - a.pj || (porcentaje(b.sacando) ?? 0) - (porcentaje(a.sacando) ?? 0))
    .slice(0, 3);

  // Cuándo jugás mejor (todos los partidos terminados).
  const franjas = new Map();
  const dias = new Map();
  const canchas = new Map();
  let tresSets = fraccion();
  for (const p of lista) {
    const hd = horaYDia(p.fechaHora);
    if (hd) {
      const f = franjaHoraria(hd.hora);
      agrupar(franjas, f, { clave: f }, p.gane);
      if (hd.dia >= 0) agrupar(dias, hd.dia, { dia: hd.dia }, p.gane);
    }
    const cancha = String(p.cancha ?? "").trim();
    if (cancha) agrupar(canchas, cancha.toLowerCase(), { nombre: cancha }, p.gane);
    if (setsJugados(p.estado) >= 3) sumarA(tresSets, p.gane);
  }

  return {
    partidos: lista.length,
    ganados: lista.filter((p) => p.gane).length,
    partidosConLog: conLog.length,
    rachas,
    saque: { sacando: total.sacando, restando: total.restando, tendencia },
    presion: total.presion,
    remontadas: total.remontadas,
    teDieronVuelta: total.teDieronVuelta,
    companeros,
    cuando: { franjas: conMinimo(franjas), dias: conMinimo(dias), canchas: conMinimo(canchas) },
    tresSets,
  };
}
