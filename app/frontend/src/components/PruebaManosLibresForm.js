"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PruebaManosLibres.module.css";

// Herramienta de QA (2026-09-07/08): el marcador en vivo por voz (US-2.7)
// falla seguido en la cancha (viento, ruido, el reconocimiento se corta
// solo) -- acá se prueban alternativas manos-libres, aisladas del
// Marcadorcito real, antes de decidir si vale la pena integrarlas:
//
//   1) Gesto de mano por cámara (MediaPipe Hands, corre en el navegador):
//      solo cuenta la mano del lado DERECHO del cuadro (la izquierda queda
//      libre para sumarle algo más adelante, a pedido del usuario). Se usa
//      la posición en pantalla para decidir el lado, no el "handedness"
//      que calcula MediaPipe (ese clasificador asume cámara tipo selfie,
//      no se pudo verificar que ande bien con la cámara trasera sin
//      probarlo en un equipo real) -- en la práctica la cámara siempre
//      venía invertida, así que el toggle de corrección de lados arranca
//      activado (destildar si en algún equipo no hiciera falta). Con la
//      mano derecha: 1 dedo levantado = punto A, 2 dedos = punto B, 3 o
//      más = deshacer (más tolerante que exigir los 5 dedos exactos).
//   2) Palabra clave: sigue usando el mismo motor de reconocimiento de voz
//      del navegador que ya fallaba antes (nube, depende de señal, se
//      corta y hay que reiniciarlo solo) -- acá lo que se prueba es un
//      vocabulario bien chiquito y directo ("punto a", "punto b",
//      "deshacer"), sin la palabra clave "marcador" obligatoria del
//      Marcadorcito real, para ver si simplificar el vocabulario alcanza
//      para que ande mejor -- no soluciona el problema de que el
//      reconocimiento se corte solo, eso es aparte.
//
// (El silbido por audio se probó y se descartó, 2026-09-08 -- ni con el
// chequeo de estabilidad de tono se pudo hacer confiable en la práctica.)
//
// Las dos alimentan el mismo marcador de prueba de abajo para poder
// compararlas en la práctica.

const REARME_GESTO_MS = 1000; // hace falta que no haya manos en cuadro este tiempo antes de contar un gesto nuevo (a pedido del usuario, 2026-09-09: tiene sentido que haya una espera entre punto y punto del mismo equipo, se deja en 1 segundo)
const GESTO_HOLD_MIN_MS = 700; // el conteo de dedos tiene que sostenerse este tiempo antes de contarlo como una decisión
const COOLDOWN_DISPARO_MS = 900; // a pedido del usuario, 2026-09-10 (probando en cancha): después de CUALQUIER disparo (punto o deshacer) hay que esperar este tiempo antes de aceptar el próximo, aunque sea un conteo distinto -- tiene que ser MAYOR que GESTO_HOLD_MIN_MS (si no, el hold-time por sí solo ya tapa el enfriamiento y no suma demora real, que es justo lo que pasaba con 600ms)

// Puntaje real de pádel/tenis (a pedido del usuario, 2026-09-09): 0/15/30/40
// con deuce ("Iguales") y ventaja cuando ambos llegan a 40, en vez de un
// contador simple. Se guardan CONTEOS CRUDOS (0,1,2,3,4...) por lado y la
// etiqueta se DERIVA de la diferencia entre los dos -- la forma estándar
// de implementar esto sin tener que manejar "ventaja" como un estado
// aparte y frágil.
const ETIQUETAS_PUNTO = ["0", "15", "30", "40"];
const INDICE_POR_ETIQUETA = { 0: 0, 15: 1, 30: 2, 40: 3 };

function etiquetaDePunto(propio, rival) {
  if (propio >= 3 && rival >= 3) {
    if (propio === rival) return "40"; // deuce -- se indica aparte como "Iguales"
    return propio > rival ? "Ventaja" : "40";
  }
  return ETIQUETAS_PUNTO[Math.min(propio, 3)];
}

// ¿Ganaría el game quien tiene `propio` puntos si suma uno más contra un
// rival que tiene `rival`? Se usa para detectar "puntos de juego" (a favor
// de quien saca) y "puntos de quiebre" (a favor de quien recibe) ANTES de
// resolver el punto, sin importar si finalmente se convierte o no.
function seriaGameSiGana(propio, rival) {
  const nuevoPropio = propio + 1;
  return Math.max(nuevoPropio, rival) >= 4 && Math.abs(nuevoPropio - rival) >= 2;
}

export default function PruebaManosLibresForm() {
  const router = useRouter();

  const [pRawA, setPRawA] = useState(0);
  const [pRawB, setPRawB] = useState(0);
  const [gamesA, setGamesA] = useState(0);
  const [gamesB, setGamesB] = useState(0);
  const [historial, setHistorial] = useState([]);
  const [sonidoActivo, setSonidoActivo] = useState(true); // a pedido del usuario, 2026-09-10: poder apagar los sonidos desde una configuración

  // Quién saca primero (a pedido del usuario, 2026-09-09): se elige UNA
  // sola vez al principio del partido, y a partir de ahí se alterna solo
  // un game para cada uno -- no hace falta volver a preguntar en cada
  // game. Con esto se puede calcular quiebres de verdad (puntos ganados
  // por quien RECIBE), no solo "puntos de juego" genéricos.
  const [sacaPrimero, setSacaPrimero] = useState(null);
  const sacaPrimeroRef = useRef(null);
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);

  // Los conteos también viven en refs (no solo en estado) porque
  // `registrarEvento` necesita el valor MÁS actual para decidir si un
  // punto cierra el game -- leer solo del estado de React podría quedar
  // un paso atrás si dos eventos llegan muy seguidos.
  const pRawARef = useRef(0);
  const pRawBRef = useRef(0);
  const gamesARef = useRef(0);
  const gamesBRef = useRef(0);

  // Historial DETALLADO de cada punto real jugado (no de las
  // correcciones por voz), para poder armar estadísticas al final --
  // separado de `historial`, que es solo el registro legible en pantalla.
  const puntosJugadosRef = useRef([]);

  // Pila de snapshots del marcador ANTES de cada punto/corrección, para
  // poder deshacer restaurando los 4 valores tal cual estaban -- evita
  // tener que "adivinar" cómo revertir un game recién ganado.
  const historialSnapshotRef = useRef([]);

  // Refs de los elementos de los efectos visuales (validados como mockup
  // por el usuario, 2026-09-08). Se disparan por classList directo, no por
  // estado de React -- así se pueden repetir aunque el mismo equipo
  // puntúe dos veces seguidas (con clases controladas por estado, React no
  // reinicia la animación si la clase no cambió de un punto al otro).
  const marcadorBoxRef = useRef(null);
  const ladoARef = useRef(null);
  const ladoBRef = useRef(null);
  const numARef = useRef(null);
  const numBRef = useRef(null);
  const ballRef = useRef(null);
  const bigTextRef = useRef(null);
  const undoMarkRef = useRef(null);

  // Sonidos: punto y game usan archivos reales (Pixabay, licencia gratis sin
  // atribución -- "Tennis Ball Hit" y "Small applause", 2026-09-10, a pedido
  // del usuario tras probar que los tonos sintetizados no se parecían en
  // nada a una pelota/aplauso real). El error/deshacer se queda sintetizado
  // (nadie se quejó de ese). El AudioContext para el error se despierta
  // recién en el primer click real (activar cámara o voz) porque el
  // navegador bloquea el audio si no hay todavía una interacción directa.
  const audioCtxRef = useRef(null);
  // Espejo en ref del toggle de sonido (a pedido del usuario, 2026-09-10):
  // las funciones de sonido se llaman desde closures de gesto/voz que se
  // arman UNA vez al activar la cámara/mic -- si se guiara solo del estado
  // de React, prendido/apagado a mitad de partido no se vería reflejado
  // hasta reactivar cámara o voz.
  const sonidoActivoRef = useRef(true);
  useEffect(() => {
    sonidoActivoRef.current = sonidoActivo;
  }, [sonidoActivo]);

  function obtenerAudioCtx() {
    if (!audioCtxRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) audioCtxRef.current = new AudioContextCtor();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }
  function sonarPunto(accion) {
    if (!sonidoActivoRef.current) return;
    // Mismo archivo para los dos equipos, pero con distinto playbackRate
    // (agudo para A, grave para B) para poder distinguir de oído quién
    // sumó sin mirar la pantalla -- mismo criterio que antes, ahora sobre
    // un sonido real en vez de un tono sintetizado.
    const audio = new Audio("/sonidos/punto.mp3");
    audio.playbackRate = accion === "punto_a" ? 1.25 : 0.85;
    audio.volume = 0.7;
    audio.play().catch(() => {});
  }
  function sonarGame() {
    if (!sonidoActivoRef.current) return;
    const audio = new Audio("/sonidos/aplauso.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }
  function sonarError() {
    if (!sonidoActivoRef.current) return;
    const ctx = obtenerAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }

  function dispararEfectoPunto(accion) {
    const lado = accion === "punto_a" ? ladoARef.current : ladoBRef.current;
    const num = accion === "punto_a" ? numARef.current : numBRef.current;
    const ball = ballRef.current;
    const bigText = bigTextRef.current;
    if (!lado || !num || !ball || !bigText) return;

    sonarPunto(accion);
    num.classList.remove(styles.pop);
    void num.offsetWidth;
    num.classList.add(styles.pop);

    lado.classList.remove(styles.flashA, styles.flashB);
    void lado.offsetWidth;
    lado.classList.add(accion === "punto_a" ? styles.flashA : styles.flashB);

    ball.classList.remove(styles.toA, styles.toB);
    void ball.offsetWidth;
    ball.style.opacity = 0;
    ball.classList.add(accion === "punto_a" ? styles.toA : styles.toB);

    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo);
    void bigText.offsetWidth;
    bigText.textContent = `¡PUNTO ${accion === "punto_a" ? "A" : "B"}!`;
    bigText.classList.add(accion === "punto_a" ? styles.showA : styles.showB);
  }

  function dispararEfectoDeshacer() {
    const box = marcadorBoxRef.current;
    const undoMark = undoMarkRef.current;
    const bigText = bigTextRef.current;
    if (!box || !undoMark || !bigText) return;

    sonarError();
    box.classList.remove(styles.shake);
    void box.offsetWidth;
    box.classList.add(styles.shake);

    undoMark.classList.remove(styles.undoShow);
    void undoMark.offsetWidth;
    undoMark.classList.add(styles.undoShow);

    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showCorreccion, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = "DESHACER";
    bigText.classList.add(styles.showUndo);
  }

  // Aviso de que se escuchó "marcador X-Y" pero los números no eran un
  // puntaje real (0/15/30/40) -- mismo lenguaje visual de error que
  // dispararEfectoDeshacer (shake + rojo), pero con su propio texto para no
  // decir "DESHACER" cuando en realidad no se deshizo nada.
  function dispararEfectoCorreccionFallida(mensaje = "No entendí el marcador") {
    const box = marcadorBoxRef.current;
    const bigText = bigTextRef.current;
    if (!box || !bigText) return;

    sonarError();
    box.classList.remove(styles.shake);
    void box.offsetWidth;
    box.classList.add(styles.shake);

    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showCorreccion, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = mensaje;
    bigText.classList.add(styles.showUndo);
  }

  function dispararEfectoCorreccion(nuevoA, nuevoB) {
    const bigText = bigTextRef.current;
    if (!bigText) return;
    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showCorreccion, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = `Marcador corregido a ${nuevoA}-${nuevoB}`;
    bigText.classList.add(styles.showCorreccion);
  }

  function dispararEfectoGame(accion) {
    const lado = accion === "punto_a" ? ladoARef.current : ladoBRef.current;
    const num = accion === "punto_a" ? numARef.current : numBRef.current;
    const ball = ballRef.current;
    const bigText = bigTextRef.current;
    if (!lado || !num || !ball || !bigText) return;

    sonarGame();
    num.classList.remove(styles.pop);
    void num.offsetWidth;
    num.classList.add(styles.pop);

    lado.classList.remove(styles.flashA, styles.flashB);
    void lado.offsetWidth;
    lado.classList.add(accion === "punto_a" ? styles.flashA : styles.flashB);

    ball.classList.remove(styles.toA, styles.toB);
    void ball.offsetWidth;
    ball.style.opacity = 0;
    ball.classList.add(accion === "punto_a" ? styles.toA : styles.toB);

    bigText.classList.remove(styles.showA, styles.showB, styles.showUndo, styles.showCorreccion, styles.showGame);
    void bigText.offsetWidth;
    bigText.textContent = `¡GAME ${accion === "punto_a" ? "A" : "B"}!`;
    bigText.classList.add(styles.showGame);
  }

  function tomarSnapshot(tuvoPuntoJugado) {
    return {
      pRawA: pRawARef.current,
      pRawB: pRawBRef.current,
      gamesA: gamesARef.current,
      gamesB: gamesBRef.current,
      tuvoPuntoJugado,
    };
  }

  function restaurarSnapshot(snap) {
    pRawARef.current = snap.pRawA;
    pRawBRef.current = snap.pRawB;
    gamesARef.current = snap.gamesA;
    gamesBRef.current = snap.gamesB;
    setPRawA(snap.pRawA);
    setPRawB(snap.pRawB);
    setGamesA(snap.gamesA);
    setGamesB(snap.gamesB);
  }

  function elegirSaque(equipo) {
    sacaPrimeroRef.current = equipo;
    setSacaPrimero(equipo);
  }

  function registrarEvento(fuente, accion) {
    const ahora = new Date().toLocaleTimeString("es-AR");

    // A pedido del usuario, 2026-09-10: elegir quién saca ya no es
    // opcional -- sin eso, un partido podía terminar sin datos de saque y
    // quedaba sin quiebres/puntos de juego en las estadísticas. Se bloquea
    // CUALQUIER gesto o palabra (puntos y deshacer) hasta que se elija.
    if (sacaPrimeroRef.current === null) {
      dispararEfectoCorreccionFallida("Elegí quién saca primero");
      return;
    }

    if (accion === "deshacer") {
      const anterior = historialSnapshotRef.current.pop();
      if (!anterior) {
        // Antes cortaba en silencio -- el gesto/palabra se reconocía bien,
        // pero al no haber nada para deshacer no se veía ningún efecto y
        // parecía que el "deshacer" no funcionaba.
        dispararEfectoCorreccionFallida("Nada para deshacer");
        return;
      }
      if (anterior.tuvoPuntoJugado) puntosJugadosRef.current.pop();
      restaurarSnapshot(anterior);
      setHistorial((h) => [{ hora: ahora, fuente, texto: "Deshacer último punto" }, ...h].slice(0, 15));
      dispararEfectoDeshacer();
      return;
    }

    historialSnapshotRef.current.push(tomarSnapshot(true));

    const antesA = pRawARef.current;
    const antesB = pRawBRef.current;

    // Saque del game actual: se alterna un game para cada uno a partir de
    // quién eligieron que saque primero (null si todavía no se eligió --
    // en ese caso no se pueden calcular quiebres/puntos de juego reales).
    const numeroDeGame = gamesARef.current + gamesBRef.current; // 0-indexado
    const sacador = sacaPrimeroRef.current
      ? numeroDeGame % 2 === 0
        ? sacaPrimeroRef.current
        : sacaPrimeroRef.current === "A"
          ? "B"
          : "A"
      : null;
    const receptor = sacador ? (sacador === "A" ? "B" : "A") : null;

    let esQuiebreOportunidad = false;
    let esGamePointSacador = false;
    if (sacador) {
      const puntosSacadorAntes = sacador === "A" ? antesA : antesB;
      const puntosReceptorAntes = receptor === "A" ? antesA : antesB;
      esQuiebreOportunidad = seriaGameSiGana(puntosReceptorAntes, puntosSacadorAntes);
      esGamePointSacador = seriaGameSiGana(puntosSacadorAntes, puntosReceptorAntes);
    }

    if (accion === "punto_a") pRawARef.current += 1;
    else pRawBRef.current += 1;

    const a = pRawARef.current;
    const b = pRawBRef.current;
    // Termina el game cuando alguno llega a 4+ puntos con 2 de diferencia
    // (maneja deuce/ventaja solo: a 3-3 nadie gana todavía, hace falta
    // sacar 2 de ventaja desde ahí).
    const terminoElGame = Math.max(a, b) >= 4 && Math.abs(a - b) >= 2;
    const ganadorGame = terminoElGame ? (a > b ? "A" : "B") : null;
    const quienGano = accion === "punto_a" ? "A" : "B";

    puntosJugadosRef.current.push({
      quienGano,
      sacador,
      antesA,
      antesB,
      esQuiebreOportunidad,
      esGamePointSacador,
      quiebreConvertido: !!(esQuiebreOportunidad && terminoElGame && ganadorGame === receptor),
      terminoElGame,
      ganadorGame,
      numeroDeGame,
      timestamp: Date.now(),
    });

    if (terminoElGame) {
      pRawARef.current = 0;
      pRawBRef.current = 0;
      setPRawA(0);
      setPRawB(0);
      if (ganadorGame === "A") {
        gamesARef.current += 1;
        setGamesA(gamesARef.current);
      } else {
        gamesBRef.current += 1;
        setGamesB(gamesBRef.current);
      }
      setHistorial((h) => [{ hora: ahora, fuente, texto: `¡Game para ${ganadorGame}!` }, ...h].slice(0, 15));
      dispararEfectoGame(ganadorGame === "A" ? "punto_a" : "punto_b");
    } else {
      setPRawA(a);
      setPRawB(b);
      setHistorial((h) => [
        { hora: ahora, fuente, texto: `Punto ${accion === "punto_a" ? "A" : "B"} (${etiquetaDePunto(a, b)}-${etiquetaDePunto(b, a)})` },
        ...h,
      ].slice(0, 15));
      dispararEfectoPunto(accion);
    }
  }

  function reiniciarMarcador() {
    pRawARef.current = 0;
    pRawBRef.current = 0;
    gamesARef.current = 0;
    gamesBRef.current = 0;
    setPRawA(0);
    setPRawB(0);
    setGamesA(0);
    setGamesB(0);
    setHistorial([]);
    historialSnapshotRef.current = [];
    puntosJugadosRef.current = [];
    sacaPrimeroRef.current = null;
    setSacaPrimero(null);
    setMostrarEstadisticas(false);
  }

  // Calcula las estadísticas finales a partir del historial detallado de
  // puntos (idea del usuario, 2026-09-09): % de puntos ganados, rachas,
  // quiebres/puntos de juego (necesitan saber quién saca), games que
  // llegaron a deuce, el game más largo, remontadas y duración.
  function calcularEstadisticas() {
    const puntos = puntosJugadosRef.current;
    if (puntos.length === 0) return null;

    let totalA = 0;
    let totalB = 0;
    let rachaActual = null;
    let rachaActualLen = 0;
    let mejorRachaPuntos = { equipo: null, largo: 0 };
    const quiebres = { A: { oportunidad: 0, convertidos: 0 }, B: { oportunidad: 0, convertidos: 0 } };
    const gamePoint = { A: { oportunidad: 0, convertidos: 0 }, B: { oportunidad: 0, convertidos: 0 } };

    for (const p of puntos) {
      if (p.quienGano === "A") totalA++;
      else totalB++;

      if (p.quienGano === rachaActual) rachaActualLen++;
      else {
        rachaActual = p.quienGano;
        rachaActualLen = 1;
      }
      if (rachaActualLen > mejorRachaPuntos.largo) mejorRachaPuntos = { equipo: rachaActual, largo: rachaActualLen };

      if (p.sacador) {
        const receptor = p.sacador === "A" ? "B" : "A";
        if (p.esQuiebreOportunidad) {
          quiebres[receptor].oportunidad++;
          if (p.quiebreConvertido) quiebres[receptor].convertidos++;
        }
        if (p.esGamePointSacador) {
          gamePoint[p.sacador].oportunidad++;
          if (p.terminoElGame && p.ganadorGame === p.sacador) gamePoint[p.sacador].convertidos++;
        }
      }
    }

    // Agrupa los puntos por game jugado, para las métricas que necesitan
    // mirar el game completo (racha de games, deuce, game más largo,
    // remontadas).
    const games = [];
    let actual = null;
    for (const p of puntos) {
      if (!actual || actual.numero !== p.numeroDeGame) {
        actual = { numero: p.numeroDeGame, puntos: [], ganador: null };
        games.push(actual);
      }
      actual.puntos.push(p);
      if (p.terminoElGame) actual.ganador = p.ganadorGame;
    }

    let mejorRachaGames = { equipo: null, largo: 0 };
    let rachaGameActual = null;
    let rachaGameLen = 0;
    let gamesEnDeuce = 0;
    const remontadas = { A: 0, B: 0 };
    let juegoMasLargo = { numero: null, cantidad: 0, ganador: null };

    for (const g of games) {
      if (!g.ganador) continue; // el game en curso todavía no cuenta

      if (g.ganador === rachaGameActual) rachaGameLen++;
      else {
        rachaGameActual = g.ganador;
        rachaGameLen = 1;
      }
      if (rachaGameLen > mejorRachaGames.largo) mejorRachaGames = { equipo: rachaGameActual, largo: rachaGameLen };

      if (g.puntos.some((p) => p.antesA >= 3 && p.antesB >= 3)) gamesEnDeuce++;

      if (g.puntos.length > juegoMasLargo.cantidad) {
        juegoMasLargo = { numero: g.numero + 1, cantidad: g.puntos.length, ganador: g.ganador };
      }

      // Remontada: el ganador del game estuvo, en algún momento, 2 o más
      // puntos abajo respecto al rival.
      const estuvoAbajo = g.puntos.some((p) => {
        const propioAntes = g.ganador === "A" ? p.antesA : p.antesB;
        const rivalAntes = g.ganador === "A" ? p.antesB : p.antesA;
        return rivalAntes - propioAntes >= 2;
      });
      if (estuvoAbajo) remontadas[g.ganador]++;
    }

    const duracionMs = puntos[puntos.length - 1].timestamp - puntos[0].timestamp;

    return {
      totalA,
      totalB,
      porcentajeA: Math.round((100 * totalA) / (totalA + totalB)),
      porcentajeB: Math.round((100 * totalB) / (totalA + totalB)),
      mejorRachaPuntos,
      mejorRachaGames,
      quiebres,
      gamePoint,
      gamesEnDeuce,
      juegoMasLargo,
      remontadas,
      duracionMs,
      juegosJugados: games.filter((g) => g.ganador).length,
      hayDatosDeSaque: sacaPrimeroRef.current != null,
    };
  }

  // Atajo de voz para corregir de golpe (idea del usuario, 2026-09-08): en
  // vez de deshacer y repuntuar varias veces para arreglar un marcador que
  // quedó mal, decir "marcador" + los dos números del resultado en
  // puntaje real de pádel ("marcador cuarenta quince", "marcador 40-15")
  // pisa el punteo del game actual. Primer número = A, segundo = B,
  // siempre en ese orden (no "el mío" / "el del rival", que sería ambiguo
  // según quién hable). Si dice un número que no es 0/15/30/40, se ignora
  // (no se sabe a qué conteo crudo corresponde).
  function ajustarMarcadorDirecto(nuevoA, nuevoB) {
    if (sacaPrimeroRef.current === null) {
      dispararEfectoCorreccionFallida("Elegí quién saca primero");
      return;
    }
    const idxA = INDICE_POR_ETIQUETA[nuevoA];
    const idxB = INDICE_POR_ETIQUETA[nuevoB];
    if (idxA === undefined || idxB === undefined) {
      // Antes esto cortaba en silencio -- sin ningún aviso, parecía que el
      // comando de voz "no hizo nada" cuando en realidad se escuchó pero
      // los números no correspondían a un puntaje real (0/15/30/40).
      const ahora = new Date().toLocaleTimeString("es-AR");
      setHistorial((h) => [{ hora: ahora, fuente: "palabra", texto: `No reconocí "${nuevoA}-${nuevoB}" como puntaje válido` }, ...h].slice(0, 15));
      dispararEfectoCorreccionFallida();
      return;
    }

    historialSnapshotRef.current.push(tomarSnapshot(false));
    pRawARef.current = idxA;
    pRawBRef.current = idxB;
    setPRawA(idxA);
    setPRawB(idxB);

    const ahora = new Date().toLocaleTimeString("es-AR");
    setHistorial((h) => [{ hora: ahora, fuente: "palabra", texto: `Marcador ajustado a ${nuevoA}-${nuevoB}` }, ...h].slice(0, 15));
    dispararEfectoCorreccion(nuevoA, nuevoB);
  }

  // ===========================================================
  // Detección de gesto de mano por cámara (MediaPipe Hands)
  // ===========================================================
  const [gestoActivo, setGestoActivo] = useState(false);
  const [cargandoModelo, setCargandoModelo] = useState(false);
  const [errorGesto, setErrorGesto] = useState("");
  // Arranca en `true`: en la práctica la cámara siempre venía invertida
  // (a pedido del usuario, 2026-09-08) -- el tilde ahora sirve para
  // DESACTIVAR esa corrección, no para activarla.
  const [espejo, setEspejo] = useState(true);
  const [ultimoGesto, setUltimoGesto] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamVideoRef = useRef(null);
  const rafGestoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const manoAusenteDesdeRef = useRef(0);
  const ultimoConteoDisparadoRef = useRef(null);
  const ultimoDisparoTsRef = useRef(0); // cuándo fue el último disparo de cualquier tipo (punto o deshacer), para el enfriamiento entre gestos distintos
  const ultimoTimestampGestoRef = useRef(0);
  const conteoActualRef = useRef(null); // el conteo que se está sosteniendo AHORA (puede no haberse disparado todavía)
  const conteoDesdeRef = useRef(0); // desde cuándo se sostiene ese conteo, sin cambiar

  // Cuenta cuántos dedos están extendidos (0 a 5). Se mide qué tan lejos
  // queda cada punta respecto de la MUÑECA, en vez de si apunta "para
  // arriba" en la pantalla -- así no depende de sostener la mano
  // perfectamente derecha (un puño con la mano un poco rotada podía leerse
  // como dedo extendido con el chequeo de altura anterior).
  function contarDedosExtendidos(landmarks) {
    const muneca = landmarks[0];
    const dedos = [
      [8, 6],
      [12, 10],
      [16, 14],
      [20, 18],
    ];
    let extendidos = 0;
    for (const [punta, nudillo] of dedos) {
      const distPuntaMuneca = Math.hypot(landmarks[punta].x - muneca.x, landmarks[punta].y - muneca.y);
      const distNudilloMuneca = Math.hypot(landmarks[nudillo].x - muneca.x, landmarks[nudillo].y - muneca.y);
      // La punta tiene que quedar claramente más lejos que el nudillo
      // medio (no solo un poco) para contar como extendido -- ese margen
      // evita falsos positivos con un puño apretado pero no perfecto.
      if (distPuntaMuneca > distNudilloMuneca * 1.15) extendidos++;
    }
    // El pulgar se mueve mayormente hacia los costados, así que se compara
    // contra la base de la mano (meñique) en vez de la muñeca.
    const distPunta = Math.hypot(landmarks[4].x - landmarks[17].x, landmarks[4].y - landmarks[17].y);
    const distBase = Math.hypot(landmarks[2].x - landmarks[17].x, landmarks[2].y - landmarks[17].y);
    if (distPunta > distBase) extendidos++;
    return extendidos;
  }

  async function activarGesto() {
    obtenerAudioCtx(); // despierta el audio ahora, con un click real, antes de que haga falta
    setErrorGesto("");
    setCargandoModelo(true);
    try {
      const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        numHands: 1, // todo el vocabulario de gestos usa una sola mano
        runningMode: "VIDEO",
      });

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamVideoRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCargandoModelo(false);
      setGestoActivo(true);
      loopGesto();
    } catch (e) {
      setCargandoModelo(false);
      setErrorGesto(`No se pudo iniciar la cámara/modelo: ${e.message}`);
    }
  }

  function dibujarMano(ctx2d, landmarks, canvas) {
    for (const p of landmarks) {
      ctx2d.beginPath();
      ctx2d.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, 2 * Math.PI);
      ctx2d.fillStyle = "#fde047";
      ctx2d.fill();
    }
  }

  function loopGesto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !canvas || !landmarker) return;

    const ctx2d = canvas.getContext("2d");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    function frame() {
      // BUG encontrado en pruebas de campo (2026-09-08): sin el try/catch,
      // un solo error de `detectForVideo` mataba el loop entero para
      // siempre (el `requestAnimationFrame` que sigue nunca se llegaba a
      // ejecutar) -- coincide con "anduvo el primer punto y después
      // nunca más". MediaPipe exige que el timestamp de cada llamada sea
      // estrictamente mayor al anterior; varios navegadores/celulares
      // redondean la precisión de `performance.now()`, así que a alta
      // velocidad de cuadros dos llamadas seguidas pueden caer en el mismo
      // milisegundo y disparar justo ese error. Se blinda por las dos
      // puntas: se fuerza que el timestamp siempre avance, y un error
      // inesperado ya no corta el loop (el `requestAnimationFrame` queda
      // fuera del `try`, así que siempre se vuelve a programar el próximo
      // cuadro pase lo que pase).
      try {
        if (video.readyState >= 2) {
          let timestamp = performance.now();
          if (timestamp <= ultimoTimestampGestoRef.current) {
            timestamp = ultimoTimestampGestoRef.current + 1;
          }
          ultimoTimestampGestoRef.current = timestamp;

          const resultado = landmarker.detectForVideo(video, timestamp);
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);

          const manos = resultado.landmarks ?? [];
          ctx2d.font = "bold 20px sans-serif";
          ctx2d.fillStyle = "#fde047";

          if (manos.length === 1) {
            manoAusenteDesdeRef.current = 0;
            const landmarks = manos[0];
            dibujarMano(ctx2d, landmarks, canvas);

            // Solo cuenta la mano del lado derecho del cuadro -- la
            // izquierda queda libre para sumarle otra cosa más adelante
            // (a pedido del usuario). Se usa la posición en pantalla, no
            // el "handedness" de MediaPipe (asume cámara selfie, no
            // confiable con la cámara trasera sin poder probarlo en un
            // equipo real).
            const dedos = contarDedosExtendidos(landmarks);
            const ladoCrudo = landmarks[0].x < 0.5 ? "izquierda" : "derecha";
            const lado = espejo ? (ladoCrudo === "izquierda" ? "derecha" : "izquierda") : ladoCrudo;

            let accion = null;
            if (lado === "derecha") {
              if (dedos === 1) accion = "punto_a";
              else if (dedos === 2) accion = "punto_b";
              else if (dedos >= 3) accion = "deshacer";
            }

            // El conteo tiene que sostenerse GESTO_HOLD_MIN_MS seguidos
            // (a pedido del usuario, tras ver que un solo cuadro de ruido
            // -- ej. un puño leído por error como "1 dedo" -- disparaba
            // de más) antes de contar como una decisión real. Si el
            // conteo cambia en el medio, el reloj se reinicia desde cero.
            if (dedos !== conteoActualRef.current) {
              conteoActualRef.current = dedos;
              conteoDesdeRef.current = Date.now();
            }
            const sostenidoMs = Date.now() - conteoDesdeRef.current;
            const listo = sostenidoMs >= GESTO_HOLD_MIN_MS;
            const segundos = (Math.min(sostenidoMs, GESTO_HOLD_MIN_MS) / 1000).toFixed(1);

            ctx2d.fillText(
              `${dedos} dedo(s) (${lado})${lado === "izquierda" ? " · reservada" : listo ? "" : ` · sosteniendo ${segundos}s`}`,
              10,
              30
            );

            const enfriado = Date.now() - ultimoDisparoTsRef.current >= COOLDOWN_DISPARO_MS;
            if (accion && listo && enfriado && dedos !== ultimoConteoDisparadoRef.current) {
              ultimoConteoDisparadoRef.current = dedos;
              ultimoDisparoTsRef.current = Date.now();
              const etiqueta = accion === "punto_a" ? "punto A" : accion === "punto_b" ? "punto B" : "deshacer";
              setUltimoGesto(`${dedos} dedo(s) (derecha) · ${etiqueta}`);
              registrarEvento("gesto", accion);
            }
          } else {
            if (manoAusenteDesdeRef.current === 0) manoAusenteDesdeRef.current = Date.now();
            if (Date.now() - manoAusenteDesdeRef.current > REARME_GESTO_MS) {
              // Rearma: pasado este tiempo sin mano en cuadro, se permite
              // volver a disparar el MISMO conteo de dedos (ej. dos puntos
              // seguidos para el mismo equipo).
              ultimoConteoDisparadoRef.current = null;
              conteoActualRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error("Error en detección de gesto (se ignora este cuadro, el loop sigue):", err);
      }
      rafGestoRef.current = requestAnimationFrame(frame);
    }
    frame();
  }

  function desactivarGesto() {
    if (rafGestoRef.current) cancelAnimationFrame(rafGestoRef.current);
    streamVideoRef.current?.getTracks().forEach((t) => t.stop());
    handLandmarkerRef.current?.close();
    handLandmarkerRef.current = null;
    setGestoActivo(false);
    setUltimoGesto("");
  }

  // ===========================================================
  // 3) Detección de palabra clave (reconocimiento de voz, vocabulario
  //    chiquito de palabras inventadas en vez de frases completas)
  // ===========================================================
  const PALABRA_A = "punto a";
  const PALABRA_B = "punto b";
  const PALABRA_DESHACER = "deshacer";

  // Para el atajo "marcador + los dos números" (ej. "marcador cuarenta
  // quince"): el reconocimiento de voz no siempre convierte los números
  // dichos en dígitos, y a veces mezcla -- un número puede venir como
  // dígito ("15") y el otro como palabra ("cuarenta") en la misma frase.
  // Se recorre palabra por palabra (no todo-o-nada) y se acepta cualquier
  // combinación de dígitos sueltos o palabras típicas de un marcador de
  // pádel/tenis (incluido "cero", para 15-0/0-15).
  const NUMERO_PALABRA = { cero: 0, quince: 15, treinta: 30, cuarenta: 40 };
  const PUNTAJES_VALIDOS = new Set(["0", "15", "30", "40"]);

  // A veces el reconocimiento transcribe los dos números pegados en un solo
  // bloque sin espacio (ej. "cuarenta quince" -> "4015" en vez de "40" y
  // "15" sueltos) -- como un puntaje crudo de pádel SOLO puede ser 0/15/30/40,
  // cualquier bloque de dígitos que no sea uno de esos cuatro tiene que ser
  // dos puntajes pegados. Se prueba cada punto de corte hasta encontrar uno
  // donde las dos mitades sean puntajes válidos.
  function separarPegado(bloque) {
    for (let i = 1; i < bloque.length; i++) {
      const izq = bloque.slice(0, i);
      const der = bloque.slice(i);
      if (PUNTAJES_VALIDOS.has(izq) && PUNTAJES_VALIDOS.has(der)) return [Number(izq), Number(der)];
    }
    return null;
  }

  function extraerDosNumeros(texto) {
    const tokens = texto.replace(/[-–]/g, " ").split(/\s+/);
    const numeros = [];
    for (const token of tokens) {
      if (numeros.length >= 2) break;
      const limpio = token.replace(/[.,!?]/g, "");
      if (/^\d+$/.test(limpio)) {
        if (PUNTAJES_VALIDOS.has(limpio)) {
          numeros.push(Number(limpio));
        } else {
          const par = separarPegado(limpio);
          if (par) numeros.push(...par);
        }
      } else if (limpio in NUMERO_PALABRA) {
        numeros.push(NUMERO_PALABRA[limpio]);
      }
    }
    return numeros.length >= 2 ? numeros.slice(0, 2) : null;
  }

  const [palabraActiva, setPalabraActiva] = useState(false);
  const [errorPalabra, setErrorPalabra] = useState("");
  const [ultimaTranscripcion, setUltimaTranscripcion] = useState("");
  const reconocimientoRef = useRef(null);
  const erroresRedSeguidosRef = useRef(0); // cuenta errores "network" consecutivos, para no reintentar por siempre si el navegador no soporta el reconocimiento (ej. Brave sin el acceso a los servicios de voz de Google habilitado)

  function activarPalabra() {
    obtenerAudioCtx(); // despierta el audio ahora, con un click real, antes de que haga falta
    setErrorPalabra("");
    erroresRedSeguidosRef.current = 0;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorPalabra("Este navegador no tiene reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "es-AR";

    recognition.onresult = (event) => {
      erroresRedSeguidosRef.current = 0; // se escuchó algo posta, ya no está roto
      const ultimo = event.results[event.results.length - 1][0].transcript.toLowerCase();
      setUltimaTranscripcion(ultimo);

      // Atajo "marcador + los dos números" (ej. "marcador cuarenta quince",
      // "marcador 40-15"): exige la palabra "marcador" antes -- sin eso,
      // cualquier par de números dichos al pasar (charla de cancha, otro
      // partido de fondo) dispararía una corrección sin querer. Se
      // chequea ANTES que los comandos normales.
      if (ultimo.includes("marcador")) {
        const numeros = extraerDosNumeros(ultimo);
        if (numeros) {
          ajustarMarcadorDirecto(numeros[0], numeros[1]);
          return;
        }
      }

      // A pedido del usuario, 2026-09-10 (probando en cancha): exigir
      // "marcador" antes de CUALQUIER comando (no solo la corrección de
      // marcador X-Y), igual que el Marcadorcito real -- sin esto,
      // cualquier charla de fondo que sonara parecido a "punto a" disparaba
      // un punto sin querer.
      if (!ultimo.includes("marcador")) return;
      if (ultimo.includes(PALABRA_A)) registrarEvento("palabra", "punto_a");
      else if (ultimo.includes(PALABRA_B)) registrarEvento("palabra", "punto_b");
      else if (ultimo.includes(PALABRA_DESHACER)) registrarEvento("palabra", "deshacer");
    };

    // Mismo patrón que el Marcadorcito real (US-2.7): el reconocimiento se
    // corta solo cada tanto, hay que reiniciarlo mientras siga activo.
    recognition.onend = () => {
      if (reconocimientoRef.current) recognition.start();
    };
    recognition.onerror = (e) => {
      setErrorPalabra(`Error de reconocimiento: ${e.error}`);
      // Un error de permiso no se soluciona reintentando -- sin este corte,
      // `onend` (que se dispara después) lo reinicia solo en loop contra el
      // mismo error, y el botón queda mostrando "activo" para siempre.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        desactivarPalabra();
        return;
      }
      // "network": el reconocimiento depende de un servicio en la nube: a
      // veces es un corte momentáneo (vale la pena reintentar solo, como ya
      // hace `onend`), pero si el navegador directamente no puede llegar a
      // ese servicio (ej. Brave sin los servicios de Google habilitados),
      // reintentaría así para siempre sin avisar claro. Después de 3 fallos
      // seguidos sin ningún resultado exitoso en el medio, se corta y se
      // avisa en vez de seguir en loop silencioso.
      if (e.error === "network") {
        erroresRedSeguidosRef.current += 1;
        if (erroresRedSeguidosRef.current >= 3) {
          desactivarPalabra();
          setErrorPalabra(
            "No se pudo conectar con el servicio de voz después de varios intentos -- probá con Chrome, o revisá que el navegador tenga habilitado el acceso a los servicios de voz de Google."
          );
        }
      }
    };

    reconocimientoRef.current = recognition;
    recognition.start();
    setPalabraActiva(true);
  }

  function desactivarPalabra() {
    const recognition = reconocimientoRef.current;
    reconocimientoRef.current = null;
    recognition?.stop();
    setPalabraActiva(false);
    setUltimaTranscripcion("");
  }

  useEffect(() => {
    return () => {
      desactivarGesto();
      desactivarPalabra();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-md bg-surface text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">🧪 Manos libres (prueba)</h1>
        <button
          onClick={() => router.push("/")}
          className="font-heading font-semibold text-sm px-3 py-1.5 rounded-full bg-bg text-ink shadow-[0_1px_3px_rgba(20,38,31,0.08)] cursor-pointer"
        >
          Volver
        </button>
      </div>

      <p className="text-xs text-muted">
        Marcador de prueba, no toca ningún partido real. Probá gesto de mano y/o palabra clave y comparé cuál anda
        mejor en la cancha.
      </p>

      {/* Elegir quién saca primero (a pedido del usuario, 2026-09-09): se
          pregunta UNA sola vez, a partir de ahí se alterna solo un game
          para cada uno -- necesario para calcular quiebres reales. */}
      {sacaPrimero === null && (
        <div className="bg-bg border-2 border-outline rounded-[14px] p-3 flex flex-col items-center gap-2">
          <span className="text-xs text-muted">¿Quién saca primero?</span>
          <div className="flex gap-2">
            <button
              onClick={() => elegirSaque("A")}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer"
            >
              Equipo A
            </button>
            <button
              onClick={() => elegirSaque("B")}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent-2 text-accent-2-ink border-2 border-outline cursor-pointer"
            >
              Equipo B
            </button>
          </div>
        </div>
      )}

      {/* Marcador compartido -- puntaje real de pádel (0/15/30/40, deuce/ventaja) + games ganados */}
      <div
        ref={marcadorBoxRef}
        className={`bg-bg border-2 border-outline rounded-[16px] p-4 flex flex-col items-center gap-2 ${styles.marcadorBox}`}
      >
        <div ref={undoMarkRef} className={styles.undoMark}>
          ✗
        </div>
        <div ref={ballRef} className={styles.ball}>
          🎾
        </div>
        <div ref={bigTextRef} className={styles.bigText}></div>

        <span className="text-xs text-muted uppercase tracking-wide">
          Games: {gamesA} — {gamesB}
          {pRawA >= 3 && pRawB >= 3 && pRawA === pRawB ? " · Iguales" : ""}
          {sacaPrimero && ` · 🎾 Saca ${(gamesA + gamesB) % 2 === 0 ? sacaPrimero : sacaPrimero === "A" ? "B" : "A"}`}
        </span>

        <div className="w-full flex items-center justify-around">
          <div ref={ladoARef} className={`flex flex-col items-center gap-1 px-4 py-1 ${styles.lado}`}>
            <span className="text-xs text-muted uppercase">Equipo A</span>
            <span ref={numARef} className="font-heading text-4xl font-bold">
              {etiquetaDePunto(pRawA, pRawB)}
            </span>
          </div>
          <span className="text-2xl text-muted">—</span>
          <div ref={ladoBRef} className={`flex flex-col items-center gap-1 px-4 py-1 ${styles.lado}`}>
            <span className="text-xs text-muted uppercase">Equipo B</span>
            <span ref={numBRef} className="font-heading text-4xl font-bold">
              {etiquetaDePunto(pRawB, pRawA)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 self-center">
        <button
          onClick={reiniciarMarcador}
          className="font-heading font-semibold text-xs px-3 py-1.5 rounded-full bg-surface text-ink border-2 border-outline cursor-pointer"
        >
          Reiniciar marcador de prueba
        </button>
        <button
          onClick={() => setMostrarEstadisticas((v) => !v)}
          className="font-heading font-semibold text-xs px-3 py-1.5 rounded-full bg-accent-3 text-accent-3-ink border-2 border-outline cursor-pointer"
        >
          📊 {mostrarEstadisticas ? "Ocultar" : "Ver"} estadísticas
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs self-center">
        <input type="checkbox" checked={sonidoActivo} onChange={(e) => setSonidoActivo(e.target.checked)} />
        🔊 Sonidos activados
      </label>

      {mostrarEstadisticas && <PanelEstadisticas estadisticas={calcularEstadisticas()} />}

      {/* Gesto de mano */}
      <div className="bg-bg border-2 border-outline rounded-[14px] p-3 flex flex-col gap-2">
        <span className="font-heading text-sm font-semibold">✊ Gesto de mano</span>
        {sacaPrimero === null && (
          <span className="text-xs font-semibold bg-accent-3/20 border-2 border-accent-3 rounded-lg px-2 py-1.5 text-ink">
            ⚠️ Elegí quién saca arriba antes de gesticular -- hasta entonces ningún gesto suma nada.
          </span>
        )}
        <span className="text-xs text-muted">
          Solo con la mano derecha: 1 dedo = punto A · 2 dedos = punto B · 3 o más = deshacer. La mano izquierda no
          hace nada todavía (reservada).
        </span>

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={espejo} onChange={(e) => setEspejo(e.target.checked)} />
          Corregir lados (destildá si en tu cámara ya viene bien sin corregir)
        </label>

        <video ref={videoRef} muted playsInline className="hidden" />
        <canvas ref={canvasRef} className={`w-full rounded-xl border-2 border-outline ${gestoActivo ? "" : "hidden"}`} />

        {!gestoActivo ? (
          <button
            onClick={activarGesto}
            disabled={cargandoModelo}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer self-start disabled:opacity-60"
          >
            {cargandoModelo ? "Cargando modelo..." : "Activar cámara"}
          </button>
        ) : (
          <>
            {ultimoGesto && <span className="text-xs text-muted">Último gesto: {ultimoGesto}</span>}
            <button
              onClick={desactivarGesto}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-red-600 border-2 border-outline cursor-pointer self-start"
            >
              Apagar cámara
            </button>
          </>
        )}
        {errorGesto && <p className="text-red-600 text-xs">{errorGesto}</p>}
      </div>

      {/* Palabra clave */}
      <div className="bg-bg border-2 border-outline rounded-[14px] p-3 flex flex-col gap-2">
        <span className="font-heading text-sm font-semibold">🗣️ Palabra clave</span>
        {sacaPrimero === null && (
          <span className="text-xs font-semibold bg-accent-3/20 border-2 border-accent-3 rounded-lg px-2 py-1.5 text-ink">
            ⚠️ Elegí quién saca arriba antes de hablar -- hasta entonces ningún comando suma nada.
          </span>
        )}
        <span className="text-xs text-muted">
          Decí <strong>&quot;marcador {PALABRA_A}&quot;</strong> = punto A · <strong>&quot;marcador {PALABRA_B}&quot;</strong> = punto B ·{" "}
          <strong>&quot;marcador {PALABRA_DESHACER}&quot;</strong> = deshacer · o decí{" "}
          <strong>&quot;marcador 40-15&quot;</strong> (A-B) para corregirlo entero de una (ej. quince-cero, treinta-quince) — siempre con
          &quot;marcador&quot; adelante, para que no dispare con charla de fondo
        </span>

        {!palabraActiva ? (
          <button
            onClick={activarPalabra}
            className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-accent text-accent-ink border-2 border-outline cursor-pointer self-start"
          >
            Activar reconocimiento
          </button>
        ) : (
          <>
            {ultimaTranscripcion && <span className="text-xs text-muted">Escuché: &quot;{ultimaTranscripcion}&quot;</span>}
            <button
              onClick={desactivarPalabra}
              className="font-heading font-semibold text-sm px-4 py-2 rounded-full bg-surface text-red-600 border-2 border-outline cursor-pointer self-start"
            >
              Apagar reconocimiento
            </button>
          </>
        )}
        {errorPalabra && <p className="text-red-600 text-xs">{errorPalabra}</p>}
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-heading text-xs font-bold uppercase tracking-wide text-muted pl-1">Historial</span>
          {historial.map((h, i) => (
            <div key={i} className="text-xs flex justify-between bg-bg border border-outline/40 rounded-lg px-2 py-1">
              <span>
                {h.fuente === "palabra" ? "🗣️" : "✊"} {h.texto}
              </span>
              <span className="text-muted">{h.hora}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatearDuracion(ms) {
  const totalSeg = Math.round(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}

// Categorías de color para las tarjetas de estadísticas (mismo esquema
// validado en el mockup del perfil, 2026-09-10: amarillo/accent = general,
// turquesa/accent-2 = rendimiento, coral/accent-3 = quiebres) -- portado acá
// porque el panel real había quedado con el diseño plano de antes.
const TILE_CLASE = {
  gen: "bg-accent/15 border-l-[5px] border-l-accent",
  rend: "bg-accent-2/15 border-l-[5px] border-l-accent-2",
  quiebre: "bg-accent-3/15 border-l-[5px] border-l-accent-3",
};

function Tile({ icono, etiqueta, valor, cat }) {
  return (
    <div className={`border-2 border-outline rounded-[10px] p-2 ${TILE_CLASE[cat]}`}>
      <div className="text-muted uppercase text-[10px]">
        {icono} {etiqueta}
      </div>
      <div className="font-heading font-semibold">{valor}</div>
    </div>
  );
}

function PanelEstadisticas({ estadisticas }) {
  if (!estadisticas) {
    return (
      <div className="bg-bg border-2 border-outline rounded-[14px] p-3 text-xs text-muted text-center">
        Todavía no se jugó ningún punto real (las correcciones por voz no cuentan para las estadísticas).
      </div>
    );
  }

  const e = estadisticas;

  return (
    <div className="bg-bg border-2 border-outline rounded-[14px] p-3 flex flex-col gap-2">
      <span className="font-heading text-sm font-semibold">📊 Estadísticas del partido</span>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Tile icono="🎾" etiqueta="Puntos ganados" cat="gen" valor={`A: ${e.totalA} (${e.porcentajeA}%) · B: ${e.totalB} (${e.porcentajeB}%)`} />
        <Tile icono="🏆" etiqueta="Games jugados" cat="gen" valor={e.juegosJugados} />
        <Tile
          icono="🔥"
          etiqueta="Racha de puntos más larga"
          cat="rend"
          valor={e.mejorRachaPuntos.largo > 0 ? `${e.mejorRachaPuntos.largo} seguidos (${e.mejorRachaPuntos.equipo})` : "—"}
        />
        <Tile
          icono="🔥"
          etiqueta="Racha de games más larga"
          cat="rend"
          valor={e.mejorRachaGames.largo > 0 ? `${e.mejorRachaGames.largo} seguidos (${e.mejorRachaGames.equipo})` : "—"}
        />
        <Tile icono="⚖️" etiqueta="Games en deuce" cat="gen" valor={e.gamesEnDeuce} />
        <Tile
          icono="🕰️"
          etiqueta="Game más largo"
          cat="rend"
          valor={e.juegoMasLargo.numero != null ? `#${e.juegoMasLargo.numero} · ${e.juegoMasLargo.cantidad} puntos (ganó ${e.juegoMasLargo.ganador})` : "—"}
        />
        <Tile icono="📈" etiqueta="Remontadas (ganó estando 2+ abajo)" cat="rend" valor={`A: ${e.remontadas.A} · B: ${e.remontadas.B}`} />
        <Tile icono="⏱️" etiqueta="Duración" cat="gen" valor={formatearDuracion(e.duracionMs)} />
      </div>

      {e.hayDatosDeSaque ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Tile icono="⚔️" etiqueta="Quiebres — A" cat="quiebre" valor={`${e.quiebres.A.convertidos}/${e.quiebres.A.oportunidad} convertidos`} />
          <Tile icono="⚔️" etiqueta="Quiebres — B" cat="quiebre" valor={`${e.quiebres.B.convertidos}/${e.quiebres.B.oportunidad} convertidos`} />
          <Tile icono="🚀" etiqueta="Puntos de juego a favor — A" cat="rend" valor={`${e.gamePoint.A.convertidos}/${e.gamePoint.A.oportunidad} convertidos`} />
          <Tile icono="🚀" etiqueta="Puntos de juego a favor — B" cat="rend" valor={`${e.gamePoint.B.convertidos}/${e.gamePoint.B.oportunidad} convertidos`} />
        </div>
      ) : (
        <p className="text-xs text-muted">
          No se eligió quién saca primero durante este partido -- no se pueden calcular quiebres ni puntos de juego
          reales (reiniciá el marcador y elegilo al empezar).
        </p>
      )}
    </div>
  );
}
