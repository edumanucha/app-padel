// Motor de puntaje de pádel (US-2.7), puro y sin dependencias de React ni
// de Supabase -- toma un estado y devuelve el estado siguiente, para poder
// probarlo y reusarlo igual en el marcador de partido de la app (US-2.7) y
// en el modo libre/ad-hoc (US-2.8).
//
// Reglas modeladas (confirmadas por el usuario en historias-usuario-mvp.md,
// US-2.7): mejor de 3 sets; cada set a 6 juegos con 2 de diferencia, o
// tie-break a 7 (2 de diferencia) en 6-6; juego 0-15-30-40 con punto de oro
// configurable.
//
// Súper tie-break en el 3er set (2026-09-10, a pedido del usuario): antes
// de que arranque el 3er set (o sea, mientras el partido sigue 1 set a 1),
// se puede elegir que ese set se juegue como un tie-break corto a 10
// (2 de diferencia) en vez de un set completo de 6 juegos -- formato
// habitual de pádel amateur para desempatar más rápido. Una vez que se
// juega el primer punto del 3er set la elección queda fija (no se puede
// cambiar a mitad de ese set). Se modela reusando el mismo mecanismo del
// tie-break normal de 6-6 (`tiebreak: true`), parametrizando el puntaje al
// que hay que llegar (`tiebreakHasta`) y marcando con
// `esSuperTiebreakFinal` que ESE tie-break decide el partido directo (no
// solo un set, como el de 6-6).

const ESCALA_PUNTOS = ["0", "15", "30", "40"];

export function crearEstadoInicial() {
  return {
    setsA: [0],
    setsB: [0],
    puntosA: 0,
    puntosB: 0,
    tiebreak: false,
    tiebreakHasta: 7,
    esSuperTiebreakFinal: false,
    saque: "A",
    finalizado: false,
    ganador: null,
  };
}

function otro(lado) {
  return lado === "A" ? "B" : "A";
}

function juegoDecidido(pA, pB, puntoDeOro) {
  const max = Math.max(pA, pB);
  const diff = Math.abs(pA - pB);
  if (max < 4) return false;
  return puntoDeOro ? diff >= 1 : diff >= 2;
}

function tiebreakDecidido(pA, pB, hasta = 7) {
  return Math.max(pA, pB) >= hasta && Math.abs(pA - pB) >= 2;
}

// Arranca el set que sigue al que se acaba de terminar. Si estamos por
// entrar al 3er set (ya se jugaron y decidieron los 2 primeros) y el
// usuario activó el súper tie-break, ese set arranca directo en modo
// tie-break a 10 en vez del 0-0 de juegos habitual. Muta `setsA`/`setsB`
// (les agrega la entrada del set nuevo) y devuelve los campos de tie-break
// a aplicar al estado.
function iniciarSiguienteSet(setsA, setsB, config) {
  const entrandoAlSet3 = setsA.length === 2;
  setsA.push(0);
  setsB.push(0);
  if (entrandoAlSet3 && config.superTiebreak3erSet) {
    return { tiebreak: true, tiebreakHasta: 10, esSuperTiebreakFinal: true };
  }
  return { tiebreak: false, tiebreakHasta: 7, esSuperTiebreakFinal: false };
}

export function setDecidido(gA, gB) {
  const max = Math.max(gA, gB);
  const min = Math.min(gA, gB);
  const diff = max - min;
  if (max >= 6 && diff >= 2) return true;
  if (max === 7 && min >= 5) return true; // 7-5, o 7-6 ya resuelto por tie-break
  return false;
}

export function setsGanados(setsA, setsB) {
  let a = 0;
  let b = 0;
  for (let i = 0; i < setsA.length; i++) {
    if (setDecidido(setsA[i], setsB[i])) {
      if (setsA[i] > setsB[i]) a++;
      else b++;
    }
  }
  return { a, b };
}

/**
 * Suma un punto al lado indicado ("A" o "B") y devuelve el estado
 * resultante más la lista de eventos ocurridos (para anuncios de voz):
 * { tipo: "juego" | "set" | "partido", ganador: "A" | "B" }
 */
export function sumarPunto(estado, lado, config = { puntoDeOro: false, superTiebreak3erSet: false }) {
  const eventos = [];
  let setsA = [...estado.setsA];
  let setsB = [...estado.setsB];
  let { puntosA, puntosB, tiebreak, saque } = estado;
  let tiebreakHasta = estado.tiebreakHasta ?? 7;
  let esSuperTiebreakFinal = estado.esSuperTiebreakFinal ?? false;

  if (tiebreak) {
    if (lado === "A") puntosA++;
    else puntosB++;
    saque = otro(saque);

    if (tiebreakDecidido(puntosA, puntosB, tiebreakHasta)) {
      const idx = setsA.length - 1;
      const ganadorSet = puntosA > puntosB ? "A" : "B";

      if (esSuperTiebreakFinal) {
        // El súper tie-break del 3er set decide el PARTIDO directo -- se
        // guarda el puntaje final (ej. 10-4) como si fuera el resultado
        // del set, para que la tabla de "sets anteriores" lo muestre bien,
        // pero no se abre un set nuevo después: el partido ya terminó acá.
        setsA[idx] = puntosA;
        setsB[idx] = puntosB;
        eventos.push({ tipo: "set", ganador: ganadorSet });
        eventos.push({ tipo: "partido", ganador: ganadorSet });
        return {
          estado: {
            setsA, setsB, puntosA: 0, puntosB: 0,
            tiebreak: false, tiebreakHasta: 7, esSuperTiebreakFinal: false,
            saque, finalizado: true, ganador: ganadorSet,
          },
          eventos,
        };
      }

      setsA[idx] = ganadorSet === "A" ? 7 : 6;
      setsB[idx] = ganadorSet === "A" ? 6 : 7;
      eventos.push({ tipo: "set", ganador: ganadorSet });
      puntosA = 0;
      puntosB = 0;

      const { a, b } = setsGanados(setsA, setsB);
      if (a === 2 || b === 2) {
        const ganadorPartido = a === 2 ? "A" : "B";
        eventos.push({ tipo: "partido", ganador: ganadorPartido });
        return {
          estado: { setsA, setsB, puntosA, puntosB, tiebreak: false, tiebreakHasta: 7, esSuperTiebreakFinal: false, saque, finalizado: true, ganador: ganadorPartido },
          eventos,
        };
      }
      const siguiente = iniciarSiguienteSet(setsA, setsB, config);
      tiebreak = siguiente.tiebreak;
      tiebreakHasta = siguiente.tiebreakHasta;
      esSuperTiebreakFinal = siguiente.esSuperTiebreakFinal;
    }

    return { estado: { setsA, setsB, puntosA, puntosB, tiebreak, tiebreakHasta, esSuperTiebreakFinal, saque, finalizado: false, ganador: null }, eventos };
  }

  if (lado === "A") puntosA++;
  else puntosB++;

  if (juegoDecidido(puntosA, puntosB, config.puntoDeOro)) {
    const ganadorJuego = puntosA > puntosB ? "A" : "B";
    const idx = setsA.length - 1;
    if (ganadorJuego === "A") setsA[idx]++;
    else setsB[idx]++;
    puntosA = 0;
    puntosB = 0;
    saque = otro(saque);
    eventos.push({ tipo: "juego", ganador: ganadorJuego });

    if (setsA[idx] === 6 && setsB[idx] === 6) {
      tiebreak = true;
      tiebreakHasta = 7;
      esSuperTiebreakFinal = false;
    } else if (setDecidido(setsA[idx], setsB[idx])) {
      const ganadorSet = setsA[idx] > setsB[idx] ? "A" : "B";
      eventos.push({ tipo: "set", ganador: ganadorSet });
      const { a, b } = setsGanados(setsA, setsB);
      if (a === 2 || b === 2) {
        const ganadorPartido = a === 2 ? "A" : "B";
        eventos.push({ tipo: "partido", ganador: ganadorPartido });
        return {
          estado: { setsA, setsB, puntosA, puntosB, tiebreak, tiebreakHasta, esSuperTiebreakFinal, saque, finalizado: true, ganador: ganadorPartido },
          eventos,
        };
      }
      const siguiente = iniciarSiguienteSet(setsA, setsB, config);
      tiebreak = siguiente.tiebreak;
      tiebreakHasta = siguiente.tiebreakHasta;
      esSuperTiebreakFinal = siguiente.esSuperTiebreakFinal;
    }
  }

  return { estado: { setsA, setsB, puntosA, puntosB, tiebreak, tiebreakHasta, esSuperTiebreakFinal, saque, finalizado: false, ganador: null }, eventos };
}

/** Texto a mostrar/anunciar para el tanteo actual de cada lado. */
export function formatearPuntos(estado) {
  if (estado.tiebreak) {
    return { textoA: String(estado.puntosA), textoB: String(estado.puntosB) };
  }

  function texto(p, otroP) {
    if (p <= 3 && otroP <= 3) return ESCALA_PUNTOS[p];
    if (p === otroP) return "40";
    if (p > otroP) return "AD";
    return "40";
  }

  return { textoA: texto(estado.puntosA, estado.puntosB), textoB: texto(estado.puntosB, estado.puntosA) };
}
